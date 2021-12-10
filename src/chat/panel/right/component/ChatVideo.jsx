import React from 'react';
import {
    Tooltip,
    Button,
    Popover
} from 'antd';

import {
    VideoCameraAddOutlined,
} from '@ant-design/icons';

import { connect } from 'react-redux'
import { actions } from '../../../redux/module/panel'


class ChatVideo extends React.Component {
    constructor(props) {
        super(props)
        this.state = {

        }
    }

    componentDidMount() {

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
        if (!this.props.checkMediaPermisssion()) {
            this.hasVideoPermission = false;
            return;
        }

        let preview = document.getElementById("preview");
        let media = {
            isRecord: true
        }
        this.props.setMedia(media);

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
        let media = {
            isRecord: false
        }
        this.props.setMedia(media);
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
                content: this.state.value,
                contentType: 3,
                fileSuffix: "webm",
                file: new Uint8Array(fileData)
            }
            this.props.sendMessage(data)
        })

        this.props.appendMessage(<video src={URL.createObjectURL(recordedBlob)} controls autoPlay={false} preload="auto" width='200px' />);

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

    render() {
        const { chooseUser } = this.props;
        return (
            <>
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
                            disabled={chooseUser.toUser === ''}
                        />
                    </Popover>
                </Tooltip>
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

ChatVideo = connect(mapStateToProps, mapDispatchToProps)(ChatVideo)

export default ChatVideo