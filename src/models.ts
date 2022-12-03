export interface RoomScreenshot {
  screenshotKey: number;
  url: string;
  key: number;
}

export interface OnlineLiveRoomInfo {
  DEFAULT_ROOM_NAME: string;
  DEFAULT_ROOM_GAME: string;
  DEFAULT_LIVE_ANNOUNCEMENT: string;
  id: number;
  roomTheme: string;
  alise: string;
  roomType: number;
  roomTypeName: string;
  roomSort: number;
  businessType: number;
  anchorName: string;
  anchorAvatarUrl: string;
  anchorAnnouncement: string;
  anchorCountryCode: string;
  anchorId: number;
  userId: number;
  roomScreenshots: RoomScreenshot[];
  onlineStatus: number;
  liveStreamStatus: number;
  lcid: number;
  lcidText: string;
  createdTime: number;
  updatedTime: number;
  endLiveTime: number;
  showScreenshots?: any;
  avatarBoxUrl?: any;
  anchorScreenshots?: any;
  templateType: number;
  liveId: number;
  startLiveTime: number;
  subRoomSort: number;
  default_ROOM_NAME: string;
  default_ROOM_GAME: string;
  default_LIVE_ANNOUNCEMENT: string;
}

export interface MultiResolutionVideoUrl {
  resolution: string;
  videoUrl: string;
  iResoVideoType: number;
  sResoVideoTypeName: string;
  sRscID: string;
  iresolution: number;
}

export interface IVod {
  id: string;
  videoUrl: string;
  videoTheme: string;
  businessType: number;
  dotType: number;
  anchorId: number;
  anchorName: string;
  authorId: number;
  author: string;
  countryCode: string;
  lcid: number;
  language?: any;
  playNum: number;
  playDuration: number;
  showScreenshots: string;
  shareScreenshot: string;
  resourceId: string;
  title: string;
  subTitle?: any;
  videoStreamStatus: number;
  createdTime: number;
  updatedTime: number;
  upNum: number;
  downNum: number;
  anchorAvatarUrl: string;
  anchorAvatarBoxUrl?: any;
  authorAvatarUrl: string;
  authorAvatarBoxUrl?: any;
  roomTypeName: string;
  onlineLiveRoomInfo: OnlineLiveRoomInfo;
  roomId: number;
  alise: string;
  transcodeStatus: number;
  videoResolution: string;
  bWM?: any;
  iResoVideoType?: any;
  gameId: number;
  type: string;
  gameName: string;
  lastUpdateTime: number;
  score: number;
  showLcid: string;
  tranCodeVideoUrl: string;
  resolution: number;
  multiResolutionVideoUrl: MultiResolutionVideoUrl[];
  cdnFlag: number;
  roomSort: number;
  liveId: string;
  sVid: string;
  startPos: number;
  introduction?: any;
  videoTagId?: any;
  videoTagName?: any;
  topicId?: any;
  topicTag?: any;
  scheduleId?: any;
  commentCount?: any;
  likeCount?: any;
  machineAuditState: number;
  secondAuditState?: any;
  threeAuditState?: any;
  offlineReason?: any;
  boutiquePool?: any;
  favor: boolean;
}

export interface IVodData {
  result: IVod;
  keyType: number;
}

export interface IVodsData {
  result: {
    liveVideoViewList: IVod[];
    pageControlView: {
      count: number;
      pageSize: number;
      pageCount: number;
      pageIndex: number;
      pageStep: number;
    }
  };
  keyType: number;
}

export interface IResponse<T> {
  code: number;
  message: string;
  data: T;
}
