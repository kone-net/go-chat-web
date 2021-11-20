import React from 'react';
import {
    Comment, Avatar, Form, Button, List, Input, Row, Col, Badge,
    Card,
    message,
    Modal,
    Drawer,
    Tag,
    Popover,
    Tooltip
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
    UngroupOutlined
} from '@ant-design/icons';
import InfiniteScroll from 'react-infinite-scroll-component';
import moment from 'moment';
import { axiosGet, axiosPostBody } from './util/Request';
import * as Params from './common/param/Params'

import protobuf from './proto/proto'
import Recorder from 'js-audio-recorder';

var socket = null

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

                // 将ArrayBuffer转换为base64进行展示
                const str = String.fromCharCode(...new Uint8Array(imgData));
                let base64String = `data:image/jpeg;base64,${window.btoa(str)}`;

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
                })
            })

        }, false)
    }

    /**
     * 获取用户详情
     */
    fetchUserDetails = () => {
        axiosGet(Params.USER_URL + this.state.fromUser)
            .then(response => {
                this.setState({
                    user: response.data,
                })
            });
    }

    /**
     * websocket连接
     */
    connection = () => {
        // let arr = []
        // let flag = false
        // let sourceBuffer
        // let mediaSource = new MediaSource()
        // var video = document.getElementById('preview1')
        // video.src = URL.createObjectURL(mediaSource)
        // mediaSource.addEventListener('sourceopen', sourceOpen);

        // function sourceOpen(e) {
        //     console.log("sourceOpen", "mediaSource ready state: ", mediaSource.readyState)
        //     // var mime = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
        //     var mime = 'video/webm; codecs="opus, vp9"';
        //     // 新建一个 sourceBuffer
        //     sourceBuffer = mediaSource.addSourceBuffer(mime);
            
        //     sourceBuffer.addEventListener('updateend', function (_) {
        //         console.log(mediaSource.readyState); // ended
        //         // sourceBuffer.appendBuffer(arr)
        //     });
        // }


        console.log("to connection")
        socket = new WebSocket("ws://localhost:8888/socket.io?user=" + this.props.match.params.user)

        socket.onopen = () => {
            heartCheck.start()
            console.log("connected")
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

                // 接受语音电话或者视频电话
                // if (messagePB.contentType === 6 || messagePB.contentType === 7) {
                //     arr.push(messagePB.file.buffer)
                //     sourceBuffer.appendBuffer(messagePB.file.buffer)
                    
                //     return;
                // }

                let avatar = this.state.avatar
                if (messagePB.messageType === 2) {
                    avatar = messagePB.avatar
                }

                this.setState({
                    comments: [
                        ...this.state.comments,
                        {
                            author: messagePB.fromUsername,
                            avatar: avatar,
                            content: <p>{(messagePB.contentType === 2 || messagePB.contentType === 3) ? <img src={"http://localhost:8888/file/" + messagePB.url} alt="" height="350px" /> : messagePB.content}</p>,
                            datetime: moment().fromNow(),
                        },
                    ],
                }, () => {
                    this.scrollToBottom()
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
                        avatar: users[index].avatar,
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

        axiosGet(Params.USER_URL + value)
            .then(response => {
                console.log(response)
                if (response.data.username === 0) {
                    message.error("无此用户")
                    return
                }
                let queryUser = {
                    username: response.data.username,
                    nickname: response.data.nickname,
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
                    let content = data[i].content;

                    if (contentType === 2) {

                    } else if (contentType === 3) {
                        content = <img src={"http://localhost:8888/file/" + data[i].url} alt="" width="150px" />
                    } else if (contentType === 4) {
                        content = <audio src={"http://localhost:8888/file/" + data[i].url} controls autoPlay={false} preload="auto" />
                    } else if (contentType === 5) {
                        content = <video src={"http://localhost:8888/file/" + data[i].url} controls autoPlay={false} preload="auto" width='200px' />
                    }

                    let comment = {
                        author: data[i].fromUsername,
                        avatar: data[i].avatar,
                        content: <p>{content}</p>,
                        datetime: moment(data[i].createAt).fromNow(),
                    }
                    comments.push(comment)
                }

                this.setState({
                    comments: comments
                }, () => {
                    this.scrollToBottom()
                })
            });
    }

    /**
     * 获取群聊信息，群成员列表
     */
    chatDetails = () => {
        axiosGet(Params.GROUP_USER_URL + this.state.toUser)
            .then(response => {
                console.log(response)
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
                file: u8
            }
            const messagePB = message.create(data)

            socket.send(message.encode(messagePB).finish())
        })
        reader.readAsArrayBuffer(files[0])
    }

    /**
     * 开始录制音频
     */
    audiorecorder = null;
    startAudio = () => {
        this.setState({
            isRecord: true
        })
        this.audiorecorder = new Recorder()
        this.audiorecorder
            .start()
            .then(() => {
                console.log("start audio...")
            }, (error) => {
                console.log("audio start error", error)
            })
    }

    /**
     * 停止录制音频
     */
    stopAudio = () => {
        this.setState({
            isRecord: false
        })
        let blob = this.audiorecorder.getWAVBlob();
        this.audiorecorder.stop()
        this.audiorecorder.destroy()
            .then(() => {
                this.audiorecorder = null;
            });
        this.audiorecorder = null;

        console.log(blob)
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
    startVideoRecord = (e) => {
        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia; //获取媒体对象（这里指摄像头）

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
                console.log(stream)
                this.recorder = new MediaRecorder(stream);

                this.recorder.ondataavailable = (event) => {
                    let data = event.data;
                    // console.log(data)
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
        preview.srcObject.getTracks().forEach((track) => track.stop());
        this.dataChunks = []
    }

    /**
     * 开启视频电话
     */
    startVideoOnline = () => {
        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia; //获取媒体对象（这里指摄像头）

        // let preview = document.getElementById("preview");
        this.setState({
            isRecord: true
        })

        navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: true,
            }).then((stream) => {
                console.log(stream)
                // preview.srcObject = stream;
                this.recorder = new MediaRecorder(stream);

                this.recorder.ondataavailable = (event) => {
                    let data = event.data;
                    // console.log(data)
                    // this.dataChunks.push(data);
                    let reader = new FileReader()
                    reader.readAsArrayBuffer(data)

                    reader.onload = ((e) => {
                        let fileData = e.target.result

                        // 上传文件必须将ArrayBuffer转换为Uint8Array
                        let data = {
                            fromUsername: localStorage.username,
                            from: this.state.fromUser,
                            to: this.state.toUser,
                            messageType: this.state.messageType,
                            content: this.state.value,
                            contentType: 6,
                            file: new Uint8Array(fileData)
                        }
                        let message = protobuf.lookup("protocol.Message")
                        const messagePB = message.create(data)
                        socket.send(message.encode(messagePB).finish())
                    })
                };
                this.recorder.start(1000);
            });
    }

    /**
     * 停止视频电话
     */
    stopVideoOnline = () => {
        if (this.recorder) {
            this.recorder.stop()
            this.recorder = null
        }
        // let preview = document.getElementById("preview");
        // preview.srcObject.getTracks().forEach((track) => track.stop());
        this.dataChunks = []
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
                            <Avatar src={this.state.user.avatar} alt={this.state.user.username} />
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
                                    icon={<PhoneOutlined />} disabled={toUser === ''}
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

                <Modal title="用户信息" visible={this.state.hasUser} onOk={this.handleOk} onCancel={this.handleCancel} okText="添加用户">
                    <p>用户名：{this.state.queryUser.username}</p>
                    <p>昵称：{this.state.queryUser.nickname}</p>
                </Modal>

                <Drawer title="成员列表" placement="right" onClose={this.drawerOnClose} visible={this.state.drawerVisible}>
                    <List
                        itemLayout="horizontal"
                        dataSource={this.state.groupUsers}
                        renderItem={item => (
                            <List.Item>
                                <List.Item.Meta
                                    style={{ paddingLeft: 30 }}
                                    avatar={<Avatar src={item.avatar} />}
                                    title={item.username}
                                    description=""
                                />
                            </List.Item>
                        )}
                    />
                </Drawer>

                <Drawer width='580px' forceRender={true} title="媒体面板" placement="right" onClose={this.mediaPanelDrawerOnClose} visible={this.state.mediaPanelDrawerVisible}>
                    <video id="preview1" width="540px" height="auto" autoPlay muted controls />
                </Drawer>
            </>
        );
    }
}

export default Panel;