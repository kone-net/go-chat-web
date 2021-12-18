export const AUDIO_ONLINE = 6; // 语音聊天
export const VIDEO_ONLINE = 7; // 视频聊天

export const DIAL_MEDIA_START = 10; // 拨打媒体开始占位符
export const DIAL_AUDIO_ONLINE = 11; // 语音聊天拨号
export const ACCEPT_AUDIO_ONLINE = 12; // 语音聊天接听
export const CANCELL_AUDIO_ONLINE = 13; // 语音聊天取消
export const REJECT_AUDIO_ONLINE = 14; // 语音聊天拒接

export const DIAL_VIDEO_ONLINE = 15; // 视频聊天拨号
export const ACCEPT_VIDEO_ONLINE = 16; // 视频聊天接听
export const CANCELL_VIDEO_ONLINE = 17; // 视频聊天取消
export const REJECT_VIDEO_ONLINE = 18; // 视频聊天拒接

export const DIAL_MEDIA_END = 20; // 拨打媒体结束占位符


export const MESSAGE_TRANS_TYPE = "webrtc"; // 消息传输类型：如果是心跳消息，该内容为heatbeat,在线视频或者音频为webrtc