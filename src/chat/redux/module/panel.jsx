const initialState = {
    userList: [],
    chooseUser: {
        toUser: '',     // 接收方uuid
        toUsername: '', // 接收方用户名
        messageType: 1, // 消息类型，1.单聊 2.群聊
        avatar: '',     // 接收方的头像
    },
    messageList: [],
    socket: null,
    media: {
        isRecord: false,
        showMediaPanel: false,
        mediaConnected: false,
        mediaReject: false,
    },
    peer: {
        localPeer: null,  // WebRTC peer 发起端
        remotePeer: null, // WebRTC peer 接收端
    }
}

export const types = {
    USER_LIST_SET: 'USER_LIST/SET',
    CHOOSE_USER_SET: 'CHOOSE_USER/SET',
    MESSAGE_LIST_SET: 'MESSAGE_LIST/SET',
    SOCKET_SET: 'SOCKET/SET',
    MEDIA_SET: 'MEDIA/SET',
    PEER_SET: 'PEER/SET',
    REMOTE_PEER_SET: 'REMOTE_PEER/SET',
}

export const actions = {
    setUserList: (userList) => ({
        type: types.USER_LIST_SET,
        userList: userList
    }),
    setChooseUser: (chooseUser) => ({
        type: types.CHOOSE_USER_SET,
        chooseUser: chooseUser
    }),
    setMessageList: (messageList) => ({
        type: types.MESSAGE_LIST_SET,
        messageList: messageList
    }),
    setSocket: (socket) => ({
        type: types.SOCKET_SET,
        socket: socket
    }),
    setMedia: (media) => ({
        type: types.MEDIA_SET,
        media: media
    }),
    setPeer: (peer) => ({
        type: types.PEER_SET,
        peer: peer
    }),
    setRemotePeer: (peer) => ({
        type: types.REMOTE_PEER_SET,
        peer: peer
    }),
}

const PanelReducer = (state = initialState, action) => {
    switch (action.type) {
        case types.USER_LIST_SET:
            return { ...state, userList: action.userList }
        case types.CHOOSE_USER_SET:
            return { ...state, chooseUser: action.chooseUser }
        case types.MESSAGE_LIST_SET:
            return { ...state, messageList: action.messageList }
        case types.SOCKET_SET:
            return { ...state, socket: action.socket }
        case types.MEDIA_SET:
            return { ...state, media: action.media }
        case types.PEER_SET:
            console.log("PanelReducer local peer --------->", state, action)
            return { ...state, peer: action.peer }
        case types.REMOTE_PEER_SET:
            console.log("PanelReducer remote peer --------->", state, action)
            return { ...state, peer: action.peer }
        default:
            return state
    }
}

export default PanelReducer
