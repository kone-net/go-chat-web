import React from 'react';
import {
    Tooltip,
    Button,
    Drawer
} from 'antd';

import {
    VideoCameraOutlined,
    PoweroffOutlined
} from '@ant-design/icons';

import * as Constant from '../../../common/constant/Constant'
import { connect } from 'react-redux'
import { actions } from '../../../redux/module/panel'

let localPeer = null;
class ChatVideoOline extends React.Component {
    constructor(props) {
        super(props)
        this.state = {

        }
    }

    componentDidMount() {
        localPeer = new RTCPeerConnection();
        let peer = {
            ...this.props.peer,
            localPeer: localPeer
        }
        this.props.setPeer(peer);
    }
    /**
     * 开启视频电话
     */
    startVideoOnline = () => {
        if (!this.props.checkMediaPermisssion()) {
            return;
        }
        this.webrtcConnection();
        let preview = document.getElementById("preview");
        this.setState({
            onlineType: 1,
            rtcType: 'offer'
        })

        navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: true,
            }).then((stream) => {
                console.log(stream)
                preview.srcObject = stream;
                stream.getTracks().forEach(track => {
                    this.props.peer.localPeer.addTrack(track, stream);
                });

                // 一定注意：需要将该动作，放在这里面，即流获取成功后，再进行offer创建。不然不能获取到流，从而不能播放视频。
                this.props.peer.localPeer.createOffer()
                    .then(offer => {
                        this.props.peer.localPeer.setLocalDescription(offer);
                        let data = {
                            contentType: Constant.VIDEO_ONLINE,
                            content: JSON.stringify(offer),
                            type: Constant.MESSAGE_TRANS_TYPE,
                        }
                        this.props.sendMessage(data);
                    });
            });

        this.setState({
            mediaPanelDrawerVisible: true
        })
    }

    /**
    * webrtc 绑定事件
    */
    webrtcConnection = () => {


        /**
         * 对等方收到ice信息后，通过调用 addIceCandidate 将接收的候选者信息传递给浏览器的ICE代理。
         * @param {候选人信息} e 
         */
        localPeer.onicecandidate = (e) => {
            console.log(e)
            if (e.candidate) {
                // rtcType参数默认是对端值为answer，如果是发起端，会将值设置为offer
                let candidate = {
                    type: 'offer_ice',
                    iceCandidate: e.candidate
                }
                let message = {
                    content: JSON.stringify(candidate),
                    type: Constant.MESSAGE_TRANS_TYPE,
                }
                this.props.sendMessage(message);
            }

        };

        /**
         * 当连接成功后，从里面获取语音视频流
         * @param {包含语音视频流} e 
         */
        localPeer.ontrack = (e) => {
            if (e && e.streams) {
                let remoteVideo = document.getElementById("remoteVideo");
                remoteVideo.srcObject = e.streams[0];
            }
        };
    }

    /**
     * 停止视频电话,屏幕共享
     */
    stopVideoOnline = () => {
        let preview = document.getElementById("preview");
        if (preview && preview.srcObject && preview.srcObject.getTracks()) {
            preview.srcObject.getTracks().forEach((track) => track.stop());
        }

        let remoteVideo = document.getElementById("remoteVideo");
        if (remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.getTracks()) {
            remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
        }
    }

    render() {
        const { chooseUser } = this.props;
        return (
            <>
                <Tooltip title="视频聊天">
                    <Button
                        shape="circle"
                        onClick={this.startVideoOnline}
                        style={{ marginRight: 10 }}
                        icon={<VideoCameraOutlined />} disabled={chooseUser.toUser === ''}
                    />
                </Tooltip>

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
                    <video id="preview" width="700px" height="auto" autoPlay muted controls />
                    <video id="remoteVideo" width="700px" height="auto" autoPlay muted controls />
                </Drawer>
            </>
        );
    }
}


function mapStateToProps(state) {
    return {
        chooseUser: state.panelReducer.chooseUser,
        socket: state.panelReducer.socket,
        peer: state.panelReducer.peer,
    }
}

function mapDispatchToProps(dispatch) {
    return {
        setMedia: (data) => dispatch(actions.setMedia(data)),
        setPeer: (data) => dispatch(actions.setPeer(data)),
    }
}

ChatVideoOline = connect(mapStateToProps, mapDispatchToProps)(ChatVideoOline)

export default ChatVideoOline