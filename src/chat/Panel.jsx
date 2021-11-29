import React from 'react';
import {
    Comment, Avatar, Form, Button, List, Input, Row, Col, Badge,
    Card,
    message,
    Modal,
    Drawer,
    Tag,
    Popover,
    Tooltip,
} from 'antd';
import {
    UserOutlined,
    TeamOutlined,
    MoreOutlined,
    SyncOutlined,
    FileAddOutlined,
    VideoCameraAddOutlined,
    AudioOutlined,
    PoweroffOutlined,
    PhoneOutlined,
    VideoCameraOutlined,
    UngroupOutlined,
    DesktopOutlined,
    FileOutlined
} from '@ant-design/icons';
import InfiniteScroll from 'react-infinite-scroll-component';
import moment from 'moment';
import { axiosGet, axiosPostBody } from './util/Request';
import * as Params from './common/param/Params'
import UserInfo from './component/UserInfo'

import protobuf from './proto/proto'
import Recorder from 'js-audio-recorder';
import { connect } from 'react-redux'
import { actions } from './redux/module/userInfo'

var socket = null;
var peer = null;

const { TextArea } = Input;

const CommentList = ({ comments }) => (
    <InfiniteScroll
        dataLength={comments.length}
        // next={loadMoreData}
        // hasMore={comments.length < 50}
        // loader={<Skeleton avatar paragraph={{ rows: 1 }} active />}
        // endMessage={<Divider plain>It is all, nothing more 🤐</Divider>}
        scrollableTarget="scrollableDiv"
    >
        <List
            dataSource={comments}
            // header={`${comments.length} ${comments.length > 1 ? 'replies' : 'reply'}`}
            itemLayout="horizontal"
            renderItem={props => <Comment {...props} />}
        />
    </InfiniteScroll>
);

const Editor = ({ onChange, onSubmit, submitting, value, toUser }) => (
    <>
        <Form.Item>
            <TextArea rows={4} onChange={onChange} value={value} id="messageArea" />
        </Form.Item>
        <Form.Item>
            <Button htmlType="submit" loading={submitting} onClick={onSubmit} type="primary" disabled={toUser === ''}>
                Send
            </Button>
        </Form.Item>
    </>
);


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
        this.state = {
            isRecord: false,
            user: {},
            comments: [],
            submitting: false,
            value: '',
            toUser: '',
            toUsername: ' ',
            fromUser: props.match.params.user,
            hasUser: false,
            queryUser: {
                username: '',
                nickname: '',
            },
            data: [

            ],
            messageType: 1,
            menuType: 1,
            drawerVisible: false,
            mediaPanelDrawerVisible: false,
            groupUsers: [],
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
            rtcType: 'answer',
        }
    }

    componentDidMount() {
        this.fetchUserDetails()
        this.fetchUserList()
        this.connection()
        this.bindParse()
    }

    /**
     * 解析剪切板的文件
     */
    bindParse = () => {
        document.getElementById("messageArea").addEventListener("paste", (e) => {
            var data = e.clipboardData
            if (!data.items) {
                return;
            }
            var items = data.items

            if (null == items || items.length <= 0) {
                return;
            }

            let item = items[0]
            if (item.kind !== 'file') {
                return;
            }
            let blob = item.getAsFile()

            let reader = new FileReader()
            reader.readAsArrayBuffer(blob)

            reader.onload = ((e) => {
                let imgData = e.target.result

                // 上传文件必须将ArrayBuffer转换为Uint8Array
                let data = {
                    fromUsername: localStorage.username,
                    from: this.state.fromUser,
                    to: this.state.toUser,
                    messageType: this.state.messageType,
                    content: this.state.value,
                    contentType: 3,
                    file: new Uint8Array(imgData)
                }
                let message = protobuf.lookup("protocol.Message")
                const messagePB = message.create(data)
                socket.send(message.encode(messagePB).finish())

                this.appendImgToPanel(imgData)
            })

        }, false)
    }

    /**
     * 本地上传后，将图片追加到聊天框
     * @param {Arraybuffer类型图片}} imgData 
     */
    appendImgToPanel(imgData) {
        // 将ArrayBuffer转换为base64进行展示
        var binary = '';
        var bytes = new Uint8Array(imgData);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        let base64String = `data:image/jpeg;base64,${window.btoa(binary)}`;

        this.setState({
            comments: [
                ...this.state.comments,
                {
                    author: localStorage.username,
                    avatar: this.state.user.avatar,
                    content: <p><img src={base64String} alt="" width="150px" /></p>,
                    datetime: moment().fromNow(),
                },
            ],
        }, () => {
            setTimeout(this.scrollToBottom(), 3000)
        })
    }

    /**
     * 获取用户详情
     */
    fetchUserDetails = () => {
        axiosGet(Params.USER_URL + this.state.fromUser)
            .then(response => {
                let user = {
                    ...response.data,
                    avatar: Params.HOST + "/file/" + response.data.avatar
                }
                this.props.setUser(user)
                this.setState({
                    user: user,
                })
            });
    }

    /**
     * websocket连接
     */
    connection = () => {
        console.log("to connect...")
        peer = new RTCPeerConnection();
        var image = document.getElementById('receiver');
        socket = new WebSocket("ws://" + Params.IP_PORT + "/socket.io?user=" + this.props.match.params.user)

        socket.onopen = () => {
            heartCheck.start()
            console.log("connected")
            this.webrtcConnection()
        }
        socket.onmessage = (message) => {
            heartCheck.start()

            // 接收到的message.data,是一个blob对象。需要将该对象转换为ArrayBuffer，才能进行proto解析
            let messageProto = protobuf.lookup("protocol.Message")
            let reader = new FileReader();
            reader.readAsArrayBuffer(message.data);
            reader.onload = ((event) => {
                let messagePB = messageProto.decode(new Uint8Array(event.target.result))
                if (this.state.toUser !== messagePB.from || messagePB.type === "heatbeat") {
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

                // 接受语音电话或者视频电话 webrtc
                if (messagePB.type === "webrtc") {
                    this.dealWebRtcMessage(messagePB);
                    return;
                }

                let avatar = this.state.avatar
                if (messagePB.messageType === 2) {
                    avatar = messagePB.avatar
                }

                // 文件内容，录制的视频，语音内容
                let content = this.getContentByType(messagePB.contentType, messagePB.url, messagePB.content)
                this.setState({
                    comments: [
                        ...this.state.comments,
                        {
                            author: messagePB.fromUsername,
                            avatar: avatar,
                            content: <p>{content}</p>,
                            datetime: moment().fromNow(),
                        },
                    ],
                }, () => {
                    setTimeout(this.scrollToBottom(), 3000)
                })
            })
        }

        socket.onclose = (message) => {
            console.log("close and reconnect-->--->")

            this.reconnect()
        }

        socket.onerror = (message) => {
            console.log("error----->>>>")

            this.reconnect()
        }
    }

    /**
     * webrtc 绑定事件
     */
    webrtcConnection = () => {
        /**
         * 对等方收到ice信息后，通过调用 addIceCandidate 将接收的候选者信息传递给浏览器的ICE代理。
         * @param {候选人信息} e 
         */
        peer.onicecandidate = (e) => {
            if (e.candidate) {
                // rtcType参数默认是对端值为answer，如果是发起端，会将值设置为offer
                let candidate = {
                    type: this.state.rtcType + '_ice',
                    iceCandidate: e.candidate
                }

                let data = {
                    fromUsername: localStorage.username,
                    from: this.state.fromUser,
                    to: this.state.toUser,
                    messageType: this.state.messageType,
                    content: JSON.stringify(candidate),
                    type: "webrtc",
                }
                let message = protobuf.lookup("protocol.Message")
                const messagePB = message.create(data)
                socket.send(message.encode(messagePB).finish())
            }

        };

        /**
         * 当连接成功后，从里面获取语音视频流
         * @param {包含语音视频流} e 
         */
        peer.ontrack = (e) => {
            if (e && e.streams) {
                let remoteVideo = document.getElementById("remoteVideo");
                remoteVideo.srcObject = e.streams[0];
            }
        };
    }

    /**
     * 处理webrtc消息，包括获取请求方的offer，回应answer等
     * @param {消息内容}} messagePB 
     */
    dealWebRtcMessage = (messagePB) => {
        const { type, sdp, iceCandidate } = JSON.parse(messagePB.content);

        if (type === "answer") {
            const offerSdp = new RTCSessionDescription({ type, sdp });
            peer.setRemoteDescription(offerSdp)
        } else if (type === "answer_ice") {
            peer.addIceCandidate(iceCandidate)
        } else if (type === "offer_ice") {
            peer.addIceCandidate(iceCandidate)
        } else if (type === "offer") {
            if (!this.checkMediaPermisssion()) {
                return;
            }
            let preview = document.getElementById("preview1");
            navigator.mediaDevices
                .getUserMedia({
                    audio: true,
                    video: true,
                }).then((stream) => {
                    preview.srcObject = stream;
                    stream.getTracks().forEach(track => {
                        peer.addTrack(track, stream);
                    });

                    // 一定注意：需要将该动作，放在这里面，即流获取成功后，再进行answer创建。不然不能获取到流，从而不能播放视频。
                    const offerSdp = new RTCSessionDescription({ type, sdp });
                    peer.setRemoteDescription(offerSdp)
                        .then(() => {
                            peer.createAnswer().then(answer => {
                                peer.setLocalDescription(answer)
                                let data = {
                                    fromUsername: localStorage.username,
                                    from: this.state.fromUser,
                                    to: this.state.toUser,
                                    messageType: this.state.messageType,
                                    content: JSON.stringify(answer),
                                    type: "webrtc",
                                }
                                let message = protobuf.lookup("protocol.Message")
                                const messagePB = message.create(data)
                                socket.send(message.encode(messagePB).finish())
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
        if (!navigator || !navigator.mediaDevices) {
            message.error("获取摄像头权限失败！")
            return false;
        }
        return true;
    }

    /**
     * 获取好友列表
     */
    fetchUserList = () => {
        this.setState({
            menuType: 1,
        })
        let data = {
            uuid: this.state.fromUser
        }
        axiosGet(Params.USER_LIST_URL, data)
            .then(response => {
                let users = response.data
                let data = []
                for (var index in users) {
                    let d = {
                        username: users[index].username,
                        uuid: users[index].uuid,
                        messageType: 1,
                        avatar: Params.HOST + "/file/" + users[index].avatar,
                    }
                    data.push(d)
                }

                this.setState({
                    data: data
                })
            })
    }

    /**
     * 获取群组列表
     */
    fetchGroupList = () => {
        this.setState({
            menuType: 2,
        })
        let data = {
            uuid: this.state.fromUser
        }
        axiosGet(Params.GROUP_LIST_URL + "/" + this.state.fromUser, data)
            .then(response => {
                let users = response.data
                let data = []
                for (var index in users) {
                    let d = {
                        username: users[index].name,
                        uuid: users[index].uuid,
                        messageType: 2,
                    }
                    data.push(d)
                }

                this.setState({
                    data: data
                })
            })
    }

    /**
     * 发送消息或者接受消息后，滚动到最后
     */
    scrollToBottom = () => {
        let div = document.getElementById("scrollableDiv")
        div.scrollTop = div.scrollHeight
    }

    /**
     * 发送消息
     * @returns 
     */
    handleSubmit = () => {
        if (!this.state.value) {
            return;
        }

        this.setState({
            submitting: true,
        });

        let data = {
            fromUsername: localStorage.username,
            from: this.state.fromUser,
            to: this.state.toUser,
            messageType: this.state.messageType,
            content: this.state.value,
            contentType: 1,
        }
        let message = protobuf.lookup("protocol.Message")
        const messagePB = message.create(data)

        socket.send(message.encode(messagePB).finish())

        this.setState({
            submitting: false,
            value: '',
            comments: [
                ...this.state.comments,
                {
                    author: localStorage.username,
                    avatar: this.state.user.avatar,
                    content: <p>{this.state.value}</p>,
                    datetime: moment().fromNow(),
                },
            ],
        }, () => {
            this.scrollToBottom()
        })
    };

    /**
     * 每次输入框输入后，将值存放在state中
     * @param {事件} e 
     */
    handleChange = e => {
        this.setState({
            value: e.target.value,
        });
    };

    /**
     * 切换用户聊天，获取用户的基本信息
     * @param {事件} e 
     */
    userChange = (e) => {
        this.setState({
            toUser: e.target.value
        })
    }

    /**
     * 选择用户，获取对应的消息
     * @param {选择的用户} value 
     */
    chooseUser = (value) => {
        this.setState({
            toUser: value.uuid,
            toUsername: value.username,
            messageType: value.messageType,
            avatar: value.avatar
        }, () => {
            this.fetchMessages()
        })
    }

    /**
     * 搜索用户
     * @param {*} value 
     * @param {*} _event 
     * @returns 
     */
    searchUser = (value, _event) => {
        if (null === value || "" === value) {
            return
        }

        let data = {
            name: value
        }
        axiosGet(Params.USER_NAME_URL, data)
            .then(response => {
                let data = response.data
                if (data.user.username === "" && data.group.name === "") {
                    message.error("未查找到群或者用户")
                    return
                }
                let queryUser = {
                    username: data.user.username,
                    nickname: data.user.nickname,

                    groupUuid: data.group.uuid,
                    groupName: data.group.name,
                }
                this.setState({
                    hasUser: true,
                    queryUser: queryUser
                });
            });
    }

    showModal = () => {
        this.setState({
            hasUser: true
        });
    };

    handleOk = () => {
        let data = {
            uuid: this.state.fromUser,
            friendUsername: this.state.queryUser.username
        }
        axiosPostBody(Params.USER_FRIEND_URL, data)
            .then(_response => {
                message.success("添加成功")
                this.fetchUserList()
                this.setState({
                    hasUser: false
                });
            });
    };

    joinGroup = () => {
        // /group/join/:userUid/:groupUuid
        axiosPostBody(Params.GROUP_JOIN_URL + this.state.fromUser + "/" + this.state.queryUser.groupUuid)
            .then(_response => {
                message.success("添加成功")
                this.fetchUserList()
                this.setState({
                    hasUser: false
                });
            });
    }

    handleCancel = () => {
        this.setState({
            hasUser: false
        });
    };

    /**
     * 获取消息
     */
    fetchMessages = () => {
        let uuid = this.state.fromUser
        if (this.state.messageType === 2) {
            uuid = this.state.toUser
        }
        let data = {
            Uuid: uuid,
            FriendUsername: this.state.toUsername,
            MessageType: this.state.messageType
        }
        axiosGet(Params.MESSAGE_URL, data)
            .then(response => {
                let comments = []
                let data = response.data
                if (null == data) {
                    data = []
                }
                for (var i = 0; i < data.length; i++) {
                    let contentType = data[i].contentType
                    let content = this.getContentByType(contentType, data[i].url, data[i].content)

                    let comment = {
                        author: data[i].fromUsername,
                        avatar: Params.HOST + "/file/" + data[i].avatar,
                        content: <p>{content}</p>,
                        datetime: moment(data[i].createAt).fromNow(),
                    }
                    comments.push(comment)
                }

                this.setState({
                    comments: comments
                }, () => {
                    this.scrollToBottom()
                    setTimeout(this.scrollToBottom(), 5000)
                })
            });
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
     * 获取群聊信息，群成员列表
     */
    chatDetails = () => {
        axiosGet(Params.GROUP_USER_URL + this.state.toUser)
            .then(response => {
                if (null == response.data) {
                    return;
                }
                this.setState({
                    drawerVisible: true,
                    groupUsers: response.data
                })
            });

    }
    drawerOnClose = () => {
        this.setState({
            drawerVisible: false,
        })
    }

    /**
     * 上传文件
     * @param {事件} e 
     * @returns 
     */
    uploadFile = (e) => {
        let files = e.target.files
        if (!files || !files[0]) {
            return;
        }
        let fileName = files[0].name
        if (null == fileName) {
            message.error("文件无名称")
            return
        }
        let index = fileName.lastIndexOf('.');
        let fileSuffix = null;
        if (index >= 0) {
            fileSuffix = fileName.substring(index + 1);
        }


        let reader = new FileReader()
        reader.onload = ((event) => {
            let file = event.target.result
            // Uint8数组可以直观的看到ArrayBuffer中每个字节（1字节 == 8位）的值。一般我们要将ArrayBuffer转成Uint类型数组后才能对其中的字节进行存取操作。
            // 上传文件必须转换为Uint8Array
            var u8 = new Uint8Array(file);
            let message = protobuf.lookup("protocol.Message")

            let data = {
                fromUsername: localStorage.username,
                from: this.state.fromUser,
                to: this.state.toUser,
                messageType: this.state.messageType,
                content: this.state.value,
                contentType: 3,
                fileSuffix: fileSuffix,
                file: u8
            }
            const messagePB = message.create(data)
            socket.send(message.encode(messagePB).finish())

            if (["jpeg", "jpg", "png", "gif", "tif", "bmp", "dwg"].indexOf(fileSuffix) !== -1) {
                this.appendImgToPanel(file)
            } else {
                this.appendFile()
            }

        })
        reader.readAsArrayBuffer(files[0])
    }

    appendFile = () => {
        this.setState({
            comments: [
                ...this.state.comments,
                {
                    author: localStorage.username,
                    avatar: this.state.user.avatar,
                    content: <p><FileOutlined style={{ fontSize: 38 }} /></p>,
                    datetime: moment().fromNow(),
                },
            ],
        }, () => {
            this.scrollToBottom()
        })
    }

    /**
     * 开始录制音频
     */
    audiorecorder = null;
    hasAudioPermission = true;
    startAudio = () => {
        this.setState({
            isRecord: true
        })
        this.audiorecorder = new Recorder()
        this.hasAudioPermission = true;
        this.audiorecorder
            .start()
            .then(() => {
                console.log("start audio...")
            }, (_error) => {
                this.hasAudioPermission = false;
                message.error("录音权限获取失败！")
            })
    }

    /**
     * 停止录制音频
     */
    stopAudio = () => {
        this.setState({
            isRecord: false
        })
        if (!this.hasAudioPermission) {
            return;
        }
        let blob = this.audiorecorder.getWAVBlob();
        this.audiorecorder.stop()
        this.audiorecorder.destroy()
            .then(() => {
                this.audiorecorder = null;
            });
        this.audiorecorder = null;

        let reader = new FileReader()
        reader.readAsArrayBuffer(blob)

        reader.onload = ((e) => {
            let imgData = e.target.result

            // 上传文件必须将ArrayBuffer转换为Uint8Array
            let data = {
                fromUsername: localStorage.username,
                from: this.state.fromUser,
                to: this.state.toUser,
                messageType: this.state.messageType,
                content: this.state.value,
                contentType: 3,
                fileSuffix: "wav",
                file: new Uint8Array(imgData)
            }
            let message = protobuf.lookup("protocol.Message")
            const messagePB = message.create(data)
            socket.send(message.encode(messagePB).finish())
        })

        this.setState({
            comments: [
                ...this.state.comments,
                {
                    author: localStorage.username,
                    avatar: this.state.user.avatar,
                    content: <p><audio src={window.URL.createObjectURL(blob)} controls autoPlay={false} preload="auto" /></p>,
                    datetime: moment().fromNow(),
                },
            ],
        }, () => {
            this.scrollToBottom()
        })
    }


    /**
     * 当按下按钮时录制视频
     */
    dataChunks = [];
    recorder = null;
    hasVideoPermission = true;
    startVideoRecord = (e) => {
        this.hasVideoPermission = true;
        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia; //获取媒体对象（这里指摄像头）
        if (!this.checkMediaPermisssion()) {
            this.hasVideoPermission = false;
            return;
        }

        let preview = document.getElementById("preview");
        this.setState({
            isRecord: true
        })

        navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: true,
            }).then((stream) => {
                preview.srcObject = stream;
                this.recorder = new MediaRecorder(stream);

                this.recorder.ondataavailable = (event) => {
                    let data = event.data;
                    this.dataChunks.push(data);
                };
                this.recorder.start(1000);
            });
    }

    /**
     * 松开按钮发送视频到服务器
     * @param {事件} e 
     */
    stopVideoRecord = (e) => {
        this.setState({
            isRecord: false
        })
        if (!this.hasVideoPermission) {
            return;
        }

        let recordedBlob = new Blob(this.dataChunks, { type: "video/webm" });

        let reader = new FileReader()
        reader.readAsArrayBuffer(recordedBlob)

        reader.onload = ((e) => {
            let fileData = e.target.result

            // 上传文件必须将ArrayBuffer转换为Uint8Array
            let data = {
                fromUsername: localStorage.username,
                from: this.state.fromUser,
                to: this.state.toUser,
                messageType: this.state.messageType,
                content: this.state.value,
                contentType: 3,
                fileSuffix: "webm",
                file: new Uint8Array(fileData)
            }
            let message = protobuf.lookup("protocol.Message")
            const messagePB = message.create(data)
            socket.send(message.encode(messagePB).finish())
        })

        this.setState({
            comments: [
                ...this.state.comments,
                {
                    author: localStorage.username,
                    avatar: this.state.user.avatar,
                    content: <p><video src={URL.createObjectURL(recordedBlob)} controls autoPlay={false} preload="auto" width='200px' /></p>,
                    datetime: moment().fromNow(),
                },
            ],
        }, () => {
            this.scrollToBottom()
        })
        if (this.recorder) {
            this.recorder.stop()
            this.recorder = null
        }
        let preview = document.getElementById("preview");
        if (preview.srcObject && preview.srcObject.getTracks()) {
            preview.srcObject.getTracks().forEach((track) => track.stop());
        }
        this.dataChunks = []
    }

    interval = null;
    /**
     * 开启视频电话
     */
    startVideoOnline = () => {
        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia; //获取媒体对象（这里指摄像头）
        if (!this.checkMediaPermisssion()) {
            return;
        }

        let preview = document.getElementById("preview1");
        this.setState({
            isRecord: true,
            rtcType: 'offer'
        })

        navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: true,
            }).then((stream) => {
                preview.srcObject = stream;
                stream.getTracks().forEach(track => {
                    peer.addTrack(track, stream);
                });

                // 一定注意：需要将该动作，放在这里面，即流获取成功后，再进行offer创建。不然不能获取到流，从而不能播放视频。
                peer.createOffer()
                    .then(offer => {
                        peer.setLocalDescription(offer);
                        let data = {
                            fromUsername: localStorage.username,
                            from: this.state.fromUser,
                            to: this.state.toUser,
                            messageType: this.state.messageType,
                            content: JSON.stringify(offer),
                            type: "webrtc",
                        }
                        let message = protobuf.lookup("protocol.Message")
                        const messagePB = message.create(data)
                        socket.send(message.encode(messagePB).finish())
                    });
            });

        this.setState({
            mediaPanelDrawerVisible: true
        })
    }

    /**
     * 停止视频电话,屏幕共享
     */
    stopVideoOnline = () => {
        this.setState({
            isRecord: false
        })
        if (this.recorder) {
            this.recorder.stop()
            this.recorder = null
        }
        let preview = document.getElementById("preview1");
        if (preview && preview.srcObject && preview.srcObject.getTracks()) {
            preview.srcObject.getTracks().forEach((track) => track.stop());
        }
        this.dataChunks = []

        if (this.interval) {
            clearInterval(this.interval)
        }

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
     * 屏幕共享
     */
    startShareOnline = () => {
        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia; //获取媒体对象（这里指摄像头）
        if (!this.checkMediaPermisssion()) {
            return;
        }

        let preview = document.getElementById("preview1");
        this.setState({
            isRecord: true,
            mediaPanelDrawerVisible: true
        })

        navigator.mediaDevices
            .getDisplayMedia({
                video: true,
            }).then((stream) => {
                preview.srcObject = stream;
            });


        var canvas = document.getElementById("canvas");
        var ctx = canvas.getContext('2d');
        this.interval = window.setInterval(() => {
            let width = this.state.share.width
            let height = this.state.share.height
            let currentScreen = {
                width: width,
                height: height
            }
            this.setState({
                currentScreen: currentScreen
            })
            ctx.drawImage(preview, 0, 0, width, height);
            let data = {
                fromUsername: localStorage.username,
                from: this.state.fromUser,
                to: this.state.toUser,
                messageType: this.state.messageType,
                content: canvas.toDataURL("image/jpeg", 0.5),
                contentType: 9,
            }
            let message = protobuf.lookup("protocol.Message")
            const messagePB = message.create(data)
            socket.send(message.encode(messagePB).finish())
        }, 60);
    }

    /**
     * 隐藏真正的文件上传控件，通过按钮模拟点击文件上传控件
     */
    clickFile = () => {
        let file = document.getElementById("file")
        file.click();
    }

    /**
     * 显示视频或者音频的面板
     */
    mediaPanelDrawerOnClose = () => {
        this.setState({
            mediaPanelDrawerVisible: false,
        })
    }
    showMediaPanel = () => {
        this.setState({
            mediaPanelDrawerVisible: true,
        })
    }

    render() {
        const { comments, submitting, value, toUser } = this.state;

        return (
            <>
                <Row style={{ paddingTop: 20, paddingBottom: 40 }}>
                    <Col span={2} style={{ borderRight: '1px solid #f0f0f0', textAlign: 'center' }}>
                        <p style={{ marginTop: 15 }}>
                            <UserInfo history={this.props.history} />
                        </p>
                        <p >
                            <Button icon={<UserOutlined />} size="large" type='link' disabled={this.state.menuType === 1} onClick={this.fetchUserList}>
                            </Button>
                        </p>
                        <p onClick={this.fetchGroupList}>
                            <Button icon={<TeamOutlined />} size="large" type='link' disabled={this.state.menuType === 2}>
                            </Button>
                        </p>
                    </Col>

                    <Col span={4} style={{ borderRight: '1px solid #f0f0f0' }}>
                        <Input.Group compact>
                            <Input.Search allowClear style={{ width: '100%' }} onSearch={this.searchUser} />
                        </Input.Group>
                        <List
                            itemLayout="horizontal"
                            dataSource={this.state.data}
                            renderItem={item => (
                                <List.Item>
                                    <List.Item.Meta
                                        style={{ paddingLeft: 30 }}
                                        onClick={() => this.chooseUser(item)}
                                        avatar={<Avatar src={item.avatar} />}
                                        title={item.username}
                                        description=""
                                    />
                                </List.Item>
                            )}
                        />
                    </Col>

                    <Col offset={1} span={16}>

                        <Badge.Ribbon text={<MoreOutlined onClick={this.chatDetails} />}>

                            <Card title={this.state.toUsername} size="larg">
                                <div
                                    id="scrollableDiv"
                                    style={{
                                        height: 450,
                                        overflow: 'auto',
                                        padding: '0 16px',
                                        border: '0px solid rgba(140, 140, 140, 0.35)',
                                    }}
                                >
                                    {comments.length > 0 && <CommentList comments={comments} />}

                                </div>
                            </Card>

                        </Badge.Ribbon>
                        <div>
                            <br />
                            <Tooltip title="上传图片或者文件">
                                <Button
                                    onClick={this.clickFile}
                                    shape="circle"
                                    style={{ marginRight: 10 }}
                                    icon={<FileAddOutlined />}
                                    disabled={toUser === ''}
                                />
                            </Tooltip>
                            <Tooltip title="发送语音">
                                <input type='file' id='file' onChange={this.uploadFile} hidden disabled={toUser === ''} />
                                <Button
                                    shape="circle"
                                    onMouseDown={this.startAudio}
                                    onMouseUp={this.stopAudio}
                                    onTouchStart={this.startAudio}
                                    onTouchEnd={this.stopAudio}
                                    style={{ marginRight: 10 }}
                                    icon={<AudioOutlined />}
                                    disabled={toUser === ''}
                                />
                            </Tooltip>

                            <Tooltip placement="bottom" title="录制视频">
                                <Popover content={<video id="preview" height="250px" width="auto" autoPlay muted />} title="视频">
                                    <Button
                                        shape="circle"
                                        onMouseDown={this.startVideoRecord}
                                        onMouseUp={this.stopVideoRecord}
                                        onTouchStart={this.startVideoRecord}
                                        onTouchEnd={this.stopVideoRecord}
                                        style={{ marginRight: 10 }}
                                        icon={<VideoCameraAddOutlined />}
                                        disabled={toUser === ''}
                                    />
                                </Popover>
                            </Tooltip>


                            <Tooltip title="语音聊天">
                                <Button
                                    shape="circle"
                                    onClick={this.startVideoOnline}
                                    style={{ marginRight: 10 }}
                                    icon={<PhoneOutlined />}
                                    // disabled={toUser === ''}
                                    disabled
                                />
                            </Tooltip>
                            <Tooltip title="视频聊天">
                                <Button
                                    shape="circle"
                                    onClick={this.startVideoOnline}
                                    style={{ marginRight: 10 }}
                                    icon={<VideoCameraOutlined />} disabled={toUser === ''}
                                />
                            </Tooltip>
                            <Tooltip title="屏幕共享">
                                <Button
                                    shape="circle"
                                    onClick={this.startShareOnline}
                                    style={{ marginRight: 10 }}
                                    icon={<DesktopOutlined />} disabled={toUser === ''}
                                />
                            </Tooltip>
                            <Tooltip title="结束视频语音">
                                <Button
                                    shape="circle"
                                    onClick={this.stopVideoOnline}
                                    style={{ marginRight: 10 }}
                                    icon={<PoweroffOutlined />}
                                />
                            </Tooltip>
                            <Tooltip title="显示视频面板">
                                <Button
                                    shape="circle"
                                    onClick={this.showMediaPanel}
                                    style={{ marginRight: 10 }}
                                    icon={<UngroupOutlined />}
                                />
                            </Tooltip>


                            <Tag icon={<SyncOutlined spin />} color="processing" hidden={!this.state.isRecord}>
                                录制中
                            </Tag>
                        </div>
                        <Comment
                            content={
                                <Editor
                                    onChange={this.handleChange}
                                    onSubmit={this.handleSubmit}
                                    submitting={submitting}
                                    value={value}
                                    toUser={this.state.toUser}
                                />
                            }
                        />

                    </Col>
                </Row>

                <Modal title="用户信息" visible={this.state.hasUser} onCancel={this.handleCancel} okText="添加用户" footer={null}>
                    <p>用户名：{this.state.queryUser.username}</p>
                    <p>昵称：{this.state.queryUser.nickname}</p>
                    <Button type='primary' onClick={this.handleOk} disabled={this.state.queryUser.username == null || this.state.queryUser.username === ''}>添加用户</Button>
                    <br /><br /><hr /><br /><br />

                    <p>群信息：{this.state.queryUser.groupName}</p>
                    <Button type='primary' onClick={this.joinGroup} disabled={this.state.queryUser.groupUuid == null || this.state.queryUser.groupUuid === ''}>添加群</Button>
                </Modal>

                <Drawer title="成员列表" placement="right" onClose={this.drawerOnClose} visible={this.state.drawerVisible}>
                    <List
                        itemLayout="horizontal"
                        dataSource={this.state.groupUsers}
                        renderItem={item => (
                            <List.Item>
                                <List.Item.Meta
                                    style={{ paddingLeft: 30 }}
                                    avatar={<Avatar src={Params.HOST + "/file/" + item.avatar} />}
                                    title={item.username}
                                    description=""
                                />
                            </List.Item>
                        )}
                    />
                </Drawer>

                <Drawer width='820px' forceRender={true} title="媒体面板" placement="right" onClose={this.mediaPanelDrawerOnClose} visible={this.state.mediaPanelDrawerVisible}>
                    <Tooltip title="结束视频语音">
                        <Button
                            shape="circle"
                            onClick={this.stopVideoOnline}
                            style={{ marginRight: 10, float: 'right' }}
                            icon={<PoweroffOutlined style={{ color: 'red' }} />}
                        />
                    </Tooltip>
                    <br />
                    <video id="preview1" width="700px" height="auto" autoPlay muted controls />
                    <video id="remoteVideo" width="700px" height="auto" autoPlay muted controls />

                    <img id="receiver" width={this.state.currentScreen.width} height="auto" alt="" />
                    <canvas id="canvas" width={this.state.currentScreen.width} height={this.state.currentScreen.height} />
                </Drawer>
            </>
        );
    }
}

function mapStateToProps(state) {
    return {
        user: state.userInfoReducer.user,
    }
}

function mapDispatchToProps(dispatch) {
    return {
        setUser: (data) => dispatch(actions.setUser(data)),
    }
}

Panel = connect(mapStateToProps, mapDispatchToProps)(Panel)

export default Panel