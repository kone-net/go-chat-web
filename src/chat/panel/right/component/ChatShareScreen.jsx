import React from 'react';
import {
    Tooltip,
    Button,
    Drawer
} from 'antd';

import {
    DesktopOutlined,
    PoweroffOutlined
} from '@ant-design/icons';

import { connect } from 'react-redux'
import { actions } from '../../../redux/module/panel'


class ChatShareScreen extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            mediaPanelDrawerVisible: false,
            share: {
                height: 540,
                width: 750
            },
            currentScreen: {
                height: 0,
                width: 0
            },
        }
    }

    componentDidMount() {

    }
    /**
     * 屏幕共享
     */
    startShareOnline = () => {
        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia; //获取媒体对象（这里指摄像头）
        if (!this.props.checkMediaPermisssion()) {
            return;
        }

        let media = {
            isRecord: false
        }
        this.props.setMedia(media);

        let preview = document.getElementById("preview");
        this.setState({
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
                content: canvas.toDataURL("image/jpeg", 0.5),
                contentType: 9,
            }
            this.props.sendMessage(data);
        }, 60);
    }

    /**
     * 停止视频电话,屏幕共享
     */
    stopVideoOnline = () => {
        this.props.setMedia({isRecord: false});
        let preview1 = document.getElementById("preview");
        if (preview1 && preview1.srcObject && preview1.srcObject.getTracks()) {
            preview1.srcObject.getTracks().forEach((track) => track.stop());
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
     * 显示视频或者音频的面板
     */
    mediaPanelDrawerOnClose = () => {
        this.setState({
            mediaPanelDrawerVisible: false,
        })
    }

    render() {
        const { chooseUser } = this.props;
        return (
            <>
                <Tooltip title="屏幕共享">
                    <Button
                        shape="circle"
                        onClick={this.startShareOnline}
                        style={{ marginRight: 10 }}
                        icon={<DesktopOutlined />} disabled={chooseUser.toUser === ''}
                    />
                </Tooltip>

                <Drawer width='820px' forceRender={true} title="媒体面板" placement="right" onClose={this.mediaPanelDrawerOnClose} visible={this.state.mediaPanelDrawerVisible}>
                    <Tooltip title="结束分享">
                        <Button
                            shape="circle"
                            onClick={this.stopVideoOnline}
                            style={{ marginRight: 10, float: 'right' }}
                            icon={<PoweroffOutlined style={{ color: 'red' }} />}
                        />
                    </Tooltip>
                    <br />
                    <video id="preview" width="700px" height="auto" autoPlay muted controls />
                    <canvas id="canvas" width={this.state.currentScreen.width} height={this.state.currentScreen.height} />
                </Drawer>
            </>
        );
    }
}


function mapStateToProps(state) {
    return {
        chooseUser: state.panelReducer.chooseUser,
    }
}

function mapDispatchToProps(dispatch) {
    return {
        setMedia: (data) => dispatch(actions.setMedia(data)),
    }
}

ChatShareScreen = connect(mapStateToProps, mapDispatchToProps)(ChatShareScreen)

export default ChatShareScreen