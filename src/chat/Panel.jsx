import React from 'react';
import {
    Button,
    Row,
    Col,
    message,
    Drawer,
    Tooltip,
    Modal
} from 'antd';
import {
    VideoCameraOutlined,
    PoweroffOutlined,
    FileOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import * as Params from './common/param/Params'
import * as Constant from './common/constant/Constant'
import Center from './panel/center/index'
import Left from './panel/left/index'
import Right from './panel/right/index'

import protobuf from './proto/proto'
import { connect } from 'react-redux'
import { actions } from './redux/module/panel'

var socket = null;
var remotePeer = null;
var localPeer = null;
var lockConnection = false;

var heartCheck = {
    timeout: 10000,
    timeoutObj: null,
    serverTimeoutObj: null,
    num: 3,
    start: function () {
        var self = this;
        var _num = this.num
        this.timeoutObj && clearTimeout(this.timeoutObj);
        this.serverTimeoutObj && clearTimeout(this.serverTimeoutObj);
        this.timeoutObj = setTimeout(function () {
            //这里发送一个心跳，后端收到后，返回一个心跳消息，
            //onmessage拿到返回的心跳就说明连接正常
            let data = {
                type: "heatbeat",
                content: "ping",
            }

            if (socket.readyState === 1) {
                let message = protobuf.lookup("protocol.Message")
                const messagePB = message.create(data)
                socket.send(message.encode(messagePB).finish())
            }

            self.serverTimeoutObj = setTimeout(function () {
                _num--
                if (_num <= 0) {
                    console.log("the ping num is more then 3, close socket!")
                    socket.close();
                }
            }, self.timeout);

        }, this.timeout)
    }
}

class Panel extends React.Component {
    constructor(props) {
        super(props)
        localStorage.uuid = props.match.params.user;
        this.state = {
            onlineType: 1, // 在线视频或者音频： 1视频，2音频
            video: {
                height: 400,
                width: 540
            },
            share: {
                height: 540,
                width: 750
            },
            currentScreen: {
                height: 0,
                width: 0
            },
            videoCallModal: false,
            callName: '',
            fromUserUuid: '',
        }
    }

    componentDidMount() {
        this.connection()
    }

    /**
     * websocket连接
     */
    connection = () => {
        console.log("to connect...")
        const configuration = {
            iceServers: [
                {
                    "urls": "stun:stun.1.google.com:19302"
                }, 
                {
                    "urls": "stun:stun.2.google.com:19302"
                }
            ]
        };
        remotePeer = new RTCPeerConnection(configuration);
        localPeer = new RTCPeerConnection(configuration);
        let peer = {
            ...this.props.peer,
            localPeer: localPeer,
            remotePeer: remotePeer
        }
        this.props.setPeer(peer);
        var image = document.getElementById('receiver');
        socket = new WebSocket("ws://" + Params.IP_PORT + "/socket.io?user=" + this.props.match.params.user)

        socket.onopen = () => {
            heartCheck.start()
            console.log("connected")
            this.webrtcConnection()

            this.props.setSocket(socket);
        }
        socket.onmessage = (message) => {
            heartCheck.start()

            // 接收到的message.data,是一个blob对象。需要将该对象转换为ArrayBuffer，才能进行proto解析
            let messageProto = protobuf.lookup("protocol.Message")
            let reader = new FileReader();
            reader.readAsArrayBuffer(message.data);
            reader.onload = ((event) => {
                let messagePB = messageProto.decode(new Uint8Array(event.target.result))
                console.log(messagePB)
                if (messagePB.type === "heatbeat") {
                    return;
                }

                // 接受语音电话或者视频电话 webrtc
                if (messagePB.type === Constant.MESSAGE_TRANS_TYPE) {
                    this.dealWebRtcMessage(messagePB);
                    return;
                }

                // 如果该消息不是正在聊天消息，显示未读提醒
                if (this.props.chooseUser.toUser !== messagePB.from) {
                    this.showUnreadMessageDot(messagePB.from);
                    return;
                }

                // 视频图像
                if (messagePB.contentType === 8) {
                    let currentScreen = {
                        width: this.state.video.width,
                        height: this.state.video.height
                    }
                    this.setState({
                        currentScreen: currentScreen
                    })
                    image.src = messagePB.content
                    return;
                }

                // 屏幕共享
                if (messagePB.contentType === 9) {
                    let currentScreen = {
                        width: this.state.share.width,
                        height: this.state.share.height
                    }
                    this.setState({
                        currentScreen: currentScreen
                    })
                    image.src = messagePB.content
                    return;
                }

                // // 接受语音电话或者视频电话 webrtc
                // if (messagePB.type === Constant.MESSAGE_TRANS_TYPE) {
                //     this.dealWebRtcMessage(messagePB);
                //     return;
                // }

                let avatar = this.props.chooseUser.avatar
                if (messagePB.messageType === 2) {
                    avatar = Params.HOST + "/file/" + messagePB.avatar
                }

                // 文件内容，录制的视频，语音内容
                let content = this.getContentByType(messagePB.contentType, messagePB.url, messagePB.content)
                let messageList = [
                    ...this.props.messageList,
                    {
                        author: messagePB.fromUsername,
                        avatar: avatar,
                        content: <p>{content}</p>,
                        datetime: moment().fromNow(),
                    },
                ];
                this.props.setMessageList(messageList);
            })
        }

        socket.onclose = (_message) => {
            console.log("close and reconnect-->--->")

            this.reconnect()
        }

        socket.onerror = (_message) => {
            console.log("error----->>>>")

            this.reconnect()
        }
    }

    /**
     * webrtc 绑定事件
     */
    webrtcConnection = () => {
        this.props.peer.localPeer.onicecandidate = (e) => {
            if (e.candidate) {
                console.log("A get candidate ", e.candidate)
                // if (null != this.props.peer.remotePeer) {
                //     this.props.peer.remotePeer.addIceCandidate(e.candidate)
                // }

                // rtcType参数默认是对端值为answer，如果是发起端，会将值设置为offer
                let candidate = {
                    type: 'offer_ice',
                    iceCandidate: e.candidate
                }
                let message = {
                    content: JSON.stringify(candidate),
                    type: Constant.MESSAGE_TRANS_TYPE,
                }
                this.sendMessage(message);
            }
        };
        this.props.peer.localPeer.ontrack = (e) => {
            if (e && e.streams) {
                let remoteVideo = document.getElementById("remoteVideoReceiver");
                remoteVideo.srcObject = e.streams[0];
            }
        };


        /**
         * 对等方收到ice信息后，通过调用 addIceCandidate 将接收的候选者信息传递给浏览器的ICE代理。
         * @param {候选人信息} e 
         */
        this.props.peer.remotePeer.onicecandidate = (e) => {
            if (e.candidate) {
                console.log("B get candidate ", e.candidate)
                // if (null != this.props.peer.localPeer) {
                //     this.props.peer.localPeer.addIceCandidate(e.candidate)
                // }

                // rtcType参数默认是对端值为answer，如果是发起端，会将值设置为offer
                let candidate = {
                    type: 'answer_ice',
                    iceCandidate: e.candidate
                }
                let message = {
                    content: JSON.stringify(candidate),
                    type: Constant.MESSAGE_TRANS_TYPE,
                }
                this.sendMessage(message);
            }

        };

        /**
         * 当连接成功后，从里面获取语音视频流
         * @param {包含语音视频流} e 
         */
        this.props.peer.remotePeer.ontrack = (e) => {
            if (e && e.streams) {
                if (this.state.onlineType === 1) {
                    let remoteVideo = document.getElementById("remoteVideoReceiver");
                    remoteVideo.srcObject = e.streams[0];
                } else {
                    let remoteAudio = document.getElementById("audioPhone");
                    remoteAudio.srcObject = e.streams[0];
                }
            }
        };
    }

    startVideoOnline = () => {
        if (!this.checkMediaPermisssion()) {
            return;
        }
        let media = {
            ...this.props.media,
            showMediaPanel: true,
        }
        this.props.setMedia(media)

        // let data = {
        //     contentType: Constant.DIAL_VIDEO_ONLINE,
        //     type: Constant.MESSAGE_TRANS_TYPE,
        // }
        // this.sendMessage(data);
        this.sendVideoData();
    }

    sendVideoData = () => {
        let preview = document.getElementById("localVideoReceiver");

        navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: true,
            }).then((stream) => {
                preview.srcObject = stream;
                stream.getTracks().forEach(track => {
                    this.props.peer.localPeer.addTrack(track, stream);
                });

                // 一定注意：需要将该动作，放在这里面，即流获取成功后，再进行offer创建。不然不能获取到流，从而不能播放视频。
                this.props.peer.localPeer.createOffer()
                    .then(offer => {
                        console.log("A send offer sdp ", offer)
                        this.props.peer.localPeer.setLocalDescription(offer);
                        let data = {
                            contentType: Constant.VIDEO_ONLINE,
                            content: JSON.stringify(offer),
                            type: Constant.MESSAGE_TRANS_TYPE,
                        }
                        this.sendMessage(data);
                    });
            });

        this.setState({
            mediaPanelDrawerVisible: true
        })
    }

    /**
     * 处理webrtc消息，包括获取请求方的offer，回应answer等
     * @param {消息内容}} messagePB 
     */
    dealWebRtcMessage = (messagePB) => {
        console.log("props peer =================> ", this.props.peer)

        if (messagePB.contentType >= Constant.DIAL_MEDIA_START && messagePB.contentType <= Constant.DIAL_MEDIA_END) {
            this.dealMediaCall(messagePB);
            return;
        }
        const { type, sdp, iceCandidate } = JSON.parse(messagePB.content);

        if (type === "answer" && null != sdp) {
            // console.log("A dealWebRtcMessage get answer message are ", type, sdp, iceCandidate)
            console.log("A dealWebRtcMessage get answer message are ", type)
            const answerSdp = new RTCSessionDescription({ type, sdp });
            console.log("answerSdp is ", answerSdp)
            if (null != answerSdp) {
                this.props.peer.localPeer.setRemoteDescription(answerSdp)
            }
        } 
        else if (type === "answer_ice" && null != iceCandidate) {
            // console.log("A dealWebRtcMessage get answer_ice message are ", type, sdp, iceCandidate)
            console.log("A dealWebRtcMessage get answer_ice message are ", type)
            this.props.peer.localPeer.addIceCandidate(iceCandidate)
        } else if (type === "offer_ice" && null != iceCandidate) {
            // console.log("B dealWebRtcMessage get offer_ice message are ", type, sdp, iceCandidate)
            console.log("B dealWebRtcMessage get offer_ice message are ", type)
            if (null != this.props.peer.remotePeer) {
                this.props.peer.remotePeer.addIceCandidate(iceCandidate)
            }
        } 
        else if (type === "offer") {
            // console.log("B dealWebRtcMessage get offer message are ", type, sdp, iceCandidate)
            console.log("B dealWebRtcMessage get offer message are ", type)
            if (!this.checkMediaPermisssion()) {
                return;
            }
            let preview

            let video = false;
            if (messagePB.contentType === Constant.VIDEO_ONLINE) {
                preview = document.getElementById("localVideoReceiver");
                video = true
                this.setState({
                    onlineType: 1,
                })

                let media = {
                    ...this.props.media,
                    showMediaPanel: true,
                }
                this.props.setMedia(media)
            } else {
                preview = document.getElementById("audioPhone");
                this.setState({
                    onlineType: 2,
                })
            }

            navigator.mediaDevices
                .getUserMedia({
                    audio: true,
                    video: video,
                }).then((stream) => {
                    preview.srcObject = stream;


                    let usePeer = this.props.peer.remotePeer
                    if (null == usePeer) {
                        return;
                    }

                    stream.getTracks().forEach(track => {
                        usePeer.addTrack(track, stream);
                    });

                    // 一定注意：需要将该动作，放在这里面，即流获取成功后，再进行answer创建。不然不能获取到流，从而不能播放视频。
                    const offerSdp = new RTCSessionDescription({ type, sdp });
                    usePeer.setRemoteDescription(offerSdp)
                        .then(() => {
                            usePeer.createAnswer()
                                .then(answer => {
                                    usePeer.setLocalDescription(answer)

                                    let message = {
                                        content: JSON.stringify(answer),
                                        type: Constant.MESSAGE_TRANS_TYPE,
                                        messageType: messagePB.contentType
                                    }
                                    this.sendMessage(message);
                                })
                        });
                });
        }
    }

    /**
     * 断开连接后重新连接
     */
    reconnectTimeoutObj = null;
    reconnect = () => {
        if (lockConnection) return;
        lockConnection = true

        this.reconnectTimeoutObj && clearTimeout(this.reconnectTimeoutObj)

        this.reconnectTimeoutObj = setTimeout(() => {
            if (socket.readyState !== 1) {
                this.connection()
            }
            lockConnection = false
        }, 10000)
    }

    /**
     * 检查媒体权限是否开启
     * @returns 媒体权限是否开启
     */
    checkMediaPermisssion = () => {
        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia; //获取媒体对象（这里指摄像头）
        if (!navigator || !navigator.mediaDevices) {
            message.error("获取摄像头权限失败！")
            return false;
        }
        return true;
    }

    /**
      * 发送消息
      * @param {消息内容} messageData 
      */
    sendMessage = (messageData) => {
        let toUser = messageData.toUser;
        if (null == toUser) {
            toUser = this.props.chooseUser.toUser;
        }
        let data = {
            ...messageData,
            messageType: this.props.chooseUser.messageType, // 消息类型，1.单聊 2.群聊
            fromUsername: localStorage.username,
            from: localStorage.uuid,
            to: toUser,
        }
        let message = protobuf.lookup("protocol.Message")
        const messagePB = message.create(data)

        socket.send(message.encode(messagePB).finish())
    }

    /**
     * 根据文件类型渲染对应的标签，比如视频，图片等。
     * @param {文件类型} type 
     * @param {文件地址} url 
     * @returns 
     */
    getContentByType = (type, url, content) => {
        if (type === 2) {
            content = <FileOutlined style={{ fontSize: 38 }} />
        } else if (type === 3) {
            content = <img src={Params.HOST + "/file/" + url} alt="" width="150px" />
        } else if (type === 4) {
            content = <audio src={Params.HOST + "/file/" + url} controls autoPlay={false} preload="auto" />
        } else if (type === 5) {
            content = <video src={Params.HOST + "/file/" + url} controls autoPlay={false} preload="auto" width='200px' />
        }

        return content;
    }

    /**
     * 停止视频电话,屏幕共享
     */
    stopVideoOnline = () => {
        this.setState({
            isRecord: false
        })

        let localVideoReceiver = document.getElementById("localVideoReceiver");
        if (localVideoReceiver && localVideoReceiver.srcObject && localVideoReceiver.srcObject.getTracks()) {
            localVideoReceiver.srcObject.getTracks().forEach((track) => track.stop());
        }

        let preview = document.getElementById("preview");
        if (preview && preview.srcObject && preview.srcObject.getTracks()) {
            preview.srcObject.getTracks().forEach((track) => track.stop());
        }

        let audioPhone = document.getElementById("audioPhone");
        if (audioPhone && audioPhone.srcObject && audioPhone.srcObject.getTracks()) {
            audioPhone.srcObject.getTracks().forEach((track) => track.stop());
        }
        this.dataChunks = []

        // 停止视频或者屏幕共享时，将画布最小
        let currentScreen = {
            width: 0,
            height: 0
        }
        this.setState({
            currentScreen: currentScreen
        })
    }

    /**
     * 显示视频或者音频的面板
     */
    mediaPanelDrawerOnClose = () => {
        let media = {
            ...this.props.media,
            showMediaPanel: false,
        }
        this.props.setMedia(media)
    }

    /**
     * 如果接收到的消息不是正在聊天的消息，显示未读提醒
     * @param {发送给对应人员的uuid} toUuid 
     */
    showUnreadMessageDot = (toUuid) => {
        let userList = this.props.userList;
        for (var index in userList) {
            if (userList[index].uuid === toUuid) {
                userList[index].hasUnreadMessage = true;
                this.props.setUserList(userList);
                break;
            }
        }
    }

    /**
     * 接听电话后，发送接听确认消息，显示媒体面板
     */
    handleOk = () => {
        this.setState({
            videoCallModal: false,
        })
        let data = {
            contentType: Constant.ACCEPT_VIDEO_ONLINE,
            type: Constant.MESSAGE_TRANS_TYPE,
            toUser: this.state.fromUserUuid,
        }
        this.sendMessage(data);

        let media = {
            ...this.props.media,
            showMediaPanel: true,
        }
        this.props.setMedia(media)
    }

    handleCancel = () => {
        let data = {
            contentType: Constant.REJECT_VIDEO_ONLINE,
            type: Constant.MESSAGE_TRANS_TYPE,
        }
        this.sendMessage(data);
        this.setState({
            videoCallModal: false,
        })
    }

    dealMediaCall = (message) => {
        if (message.contentType === Constant.DIAL_AUDIO_ONLINE || message.contentType === Constant.DIAL_VIDEO_ONLINE) {
            this.setState({
                videoCallModal: true,
                callName: message.fromUsername,
                fromUserUuid: message.from,
            })
            return;
        }

        if (message.contentType === Constant.CANCELL_AUDIO_ONLINE || message.contentType === Constant.CANCELL_VIDEO_ONLINE) {
            this.setState({
                videoCallModal: false,
            })
            return;
        }

        if (message.contentType === Constant.REJECT_AUDIO_ONLINE || message.contentType === Constant.REJECT_VIDEO_ONLINE) {
            let media = {
                ...this.props.media,
                mediaReject: true,
            }
            this.props.setMedia(media);
            return;
        }

        if (message.contentType === Constant.ACCEPT_VIDEO_ONLINE || message.contentType === Constant.ACCEPT_AUDIO_ONLINE) {
            let media = {
                ...this.props.media,
                mediaConnected: true,
            }
            this.props.setMedia(media);
        }
    }

    render() {

        return (
            <>
                <Row style={{ paddingTop: 35, borderBottom: '1px solid #f0f0f0', borderTop: '1px solid #f0f0f0' }}>
                    <Col span={2} style={{ borderRight: '1px solid #f0f0f0', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
                        <Left history={this.props.history} />
                    </Col>

                    <Col span={4} style={{ borderRight: '1px solid #f0f0f0', borderTop: '1px solid #f0f0f0' }}>
                        <Center />
                    </Col>

                    <Col offset={1} span={16} style={{ borderTop: '1px solid #f0f0f0' }}>
                        <Right
                            history={this.props.history}
                            sendMessage={this.sendMessage}
                            checkMediaPermisssion={this.checkMediaPermisssion}
                        />
                    </Col>
                    <Tooltip title="视频聊天">
                        <Button
                            shape="circle"
                            onClick={this.startVideoOnline}
                            style={{ marginRight: 10 }}
                            icon={<VideoCameraOutlined />} 
                        />
                    </Tooltip>
                </Row>


                <Drawer width='820px' forceRender={true} title="媒体面板" placement="right" onClose={this.mediaPanelDrawerOnClose} open={this.props.media.showMediaPanel}>
                    <Tooltip title="结束视频语音">
                        <Button
                            shape="circle"
                            onClick={this.stopVideoOnline}
                            style={{ marginRight: 10, float: 'right' }}
                            icon={<PoweroffOutlined style={{ color: 'red' }} />}
                        />
                    </Tooltip>
                    <br />
                    <video id="localVideoReceiver" width="700px" height="auto" autoPlay muted controls />
                    <video id="remoteVideoReceiver" width="700px" height="auto" autoPlay muted controls />

                    <img id="receiver" width={this.state.currentScreen.width} height="auto" alt="" />
                    <canvas id="canvas" width={this.state.currentScreen.width} height={this.state.currentScreen.height} />
                    <audio id="audioPhone" autoPlay controls />
                </Drawer>

                <Modal
                    title="视频电话"
                    visible={this.state.videoCallModal}
                    onOk={this.handleOk}
                    onCancel={this.handleCancel}
                    okText="接听"
                    cancelText="挂断"
                >
                    <p>{this.state.callName}来电</p>
                </Modal>
            </>
        );
    }
}

function mapStateToProps(state) {
    return {
        user: state.userInfoReducer.user,
        media: state.panelReducer.media,
        messageList: state.panelReducer.messageList,
        chooseUser: state.panelReducer.chooseUser,
        peer: state.panelReducer.peer,
        userList: state.panelReducer.userList,
    }
}

function mapDispatchToProps(dispatch) {
    return {
        setUserList: (data) => dispatch(actions.setUserList(data)),
        setMessageList: (data) => dispatch(actions.setMessageList(data)),
        setSocket: (data) => dispatch(actions.setSocket(data)),
        setMedia: (data) => dispatch(actions.setMedia(data)),
        setPeer: (data) => dispatch(actions.setPeer(data)),
    }
}

Panel = connect(mapStateToProps, mapDispatchToProps)(Panel)

export default Panel