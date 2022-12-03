import axios from 'axios';
import Ffmpeg from 'fluent-ffmpeg';
import FormData from 'form-data';
import { createReadStream, createWriteStream, existsSync, mkdirSync, unlinkSync, WriteStream } from 'fs';
import { Parser } from 'm3u8-parser';
import MultipartDownload from 'multipart-download';
import Multistream from 'multistream';
import pLimit from 'p-limit';
import { resolve } from 'path';
import { IResponse, IVodData, IVodsData, MultiResolutionVideoUrl } from './models';

const downloadVideo = async (downloadUrl: string, outputDir: string, fileName: string) => {
  return new Promise((res, rej) =>
    new MultipartDownload().start(downloadUrl, {
      numOfConnections: 5,
      saveDirectory: outputDir,
      fileName
    }).on('error', (err) => {
      rej(err);
    })
    .on('end', () => {
      res();
    })
  );
}

const downloadChunk = async (w: WriteStream, downloadUrl: string) => {
  const response = await axios.request({
    method: "GET",
    url: downloadUrl,
    responseType: "stream",
  });

  response.data.pipe(w, { end: false });

  return new Promise((res, reject) => {
    response.data.on("end", () => {
      res(null);
    });

    response.data.on("error", (err) => {
      reject(err);
    });
  });
}

const downloadSegment = async (downloadUrl: string, path: string) => {
  let retry = 5;
  let writer: WriteStream | undefined;

  do {
    try {
      writer = createWriteStream(path)
      await downloadChunk(writer, downloadUrl);
      retry = -10;
      writer.end();
    } catch (e) {
      retry--;
      console.error(`Downloading part error: ${e}`);
      if (writer) {
        writer.end();
        unlinkSync(path);
      }
    }
  } while (retry > 0);

  if (retry !== -10) {
    throw new Error('Impossible to download part');
  }
}

const parseM3u8 = async (videoUrl: string) => {
  const m3u8Text = await axios.get<any>(videoUrl).then((x) => x.data as any);

  const parser = new Parser();
  parser.push(m3u8Text);
  parser.end();

  const manifest = parser.manifest;
  return manifest.segments;
}

const fetchVods = async (streamerId: string) => {
  const formData = new FormData();

  formData.append('keyType', 0);
  formData.append('body', JSON.stringify({}));

  return axios.post<any>('https://video.nimo.tv/v1/liveVideo/videoListForAgg-1-100/1046/' + streamerId, formData, { headers: formData.getHeaders() }).then((x) => (x.data as IResponse<IVodsData>).data.result);
}

const fetchVod = async (vodId: string) => {
  const formData = new FormData();

  formData.append('keyType', 0);
  formData.append('body', JSON.stringify({}));

  return axios.post<any>('https://video.nimo.tv/v1/liveVideo/liveVideoInfo/' + vodId, formData, { headers: formData.getHeaders() }).then((x) => (x.data as IResponse<IVodData>).data.result);
}

const transcode = async (outputDir: string, inputFile: string, outputFileName: string, progressFn: (p: any, type: string) => void) => {
  const promises = [] as  Promise<any>[];

  promises.push(new Promise((res, rej) => Ffmpeg(resolve(outputDir, inputFile))
    .videoCodec('libx264')
    .videoBitrate('6000k')
    .outputOptions(['-preset medium', '-keyint_min 30', '-minrate 6000k', '-maxrate 6000k', '-g 120', '-bufsize 12000k'])
    .format('flv')
    .audioChannels(2)
    .audioCodec('aac')
    .output(resolve(outputDir, `${outputFileName}.flv`))
    .on('end', () => res(null))
    .on('error', (error) => rej(new Error(error)))
    .on('progress', (progress) => {
      progressFn(progress, 'FLV');
    })
    .run()
  ));

  promises.push(new Promise((res, rej) => Ffmpeg(resolve(outputDir, inputFile))
    .videoCodec('libx264')
    .videoBitrate('6000k')
    .outputOptions(['-preset medium', '-keyint_min 30', '-minrate 6000k', '-maxrate 6000k', '-g 120', '-bufsize 12000k'])
    .format('mp4')
    .audioChannels(2)
    .audioCodec('aac')
    .output(resolve(outputDir, `${outputFileName}.mp4`))
    .on('end', () => res(null))
    .on('error', (error) => rej(new Error(error)))
    .on('progress', (progress) => {
      progressFn(progress, 'MP4');
    })
    .run()
  ));

  return Promise.all(promises);
}

const mergeFiles = async (files: string[], writerFinal: WriteStream) => {
  const stream = new (Multistream as any)(files.map((file) => createReadStream(file))).pipe(writerFinal);

  await new Promise((res, reject) => {
    stream.on("close", () => {
      res(null);
    });

    stream.on("error", (err) => {
      reject(err);
    });
  });
}

const downloadFromM3u8 = async (listUrl: string, tempDir: string, outputDir: string, filename: string, concurrence: number) => {
  const segments = await parseM3u8(listUrl);

  const baseURLArr = listUrl.split("/");
  baseURLArr.pop();
  const baseURL = baseURLArr.join("/");

  const limit = pLimit(concurrence);
  let completed = 0;
  const files = [] as string[];

  await Promise.all(segments.map((segment, i) => limit(async () => {
    const file = resolve(tempDir, `${filename}-${i}.ts`);

    if (!existsSync(file)) {
      await downloadSegment(`${baseURL}/${segment.uri}`, file);
      completed++;
      const progress = Math.round((completed * 100) / segments.length);
      console.log('Downloading: ' + progress + '%');
    }

    files[i] = file;
  })));

  if (existsSync(resolve(outputDir, `${filename}.ts`))) {
    unlinkSync(resolve(outputDir, `${filename}.ts`));
  }

  console.log('Merging files...');
  const writerFinal = createWriteStream(resolve(outputDir, `${filename}.ts`));
  await mergeFiles(files, writerFinal);

  // rmdirSync(tempDir, { recursive: true });
}

(async () => {
  const streamerId = '6164380517'; // Streamer id from nimo profile page
  const id = 'v-1714005417899983715'; // Vod id from url
  const outputDir = '/media/mateus/Mateus/dw/output';
  const tempDir = '/media/mateus/Mateus/dw/temp';
  const concurrence = 20;

  if (!existsSync(tempDir)){
    mkdirSync(tempDir);
  }

  if (!existsSync(outputDir)){
    mkdirSync(outputDir);
  }

  console.log('Fetching data!');

  const vods = await fetchVods(streamerId);
  console.log(vods);
  const vod = await fetchVod(id);

  console.log('Downloading...');
  let extension: 'mp4' | 'ts' | undefined;

  try {
    extension = 'mp4';
    console.log(vod.tranCodeVideoUrl)
    if (vod.tranCodeVideoUrl && vod.transcodeStatus === 2) {
      await downloadVideo(vod.tranCodeVideoUrl, outputDir, `${id}.mp4`);
    } else {
      throw new Error('Missing tranCodeVideoUrl!');
    }
  } catch {
    extension = 'ts';
    let bestUrlFound: MultiResolutionVideoUrl | undefined;

    for (const url of vod.multiResolutionVideoUrl) {
      if (!bestUrlFound || bestUrlFound.iresolution < url.iresolution) {
        bestUrlFound = url;
      }
    }

    if (!bestUrlFound) {
      throw new Error('Video not available to download!');
    }

    await downloadFromM3u8(bestUrlFound.videoUrl, tempDir, outputDir, id, concurrence);
  }

  if (extension) {
    await transcode(outputDir, `${id}.${extension}`, id, (progress, type) => {
      console.log(`Transcoding to ${type}: ` + progress.percent.toFixed(0) + '%');
    });
  }
})().then(() => console.log('Success..')).catch((e) => {
  console.error(e);
});
