import React from 'react';
import {
    Tooltip,
    Button,
    message
} from 'antd';

import {
    FileAddOutlined,
    FileOutlined
} from '@ant-design/icons';

import { connect } from 'react-redux'
import { actions } from '../../../redux/module/panel'


class ChatFile extends React.Component {
    constructor(props) {
        super(props)
        this.state = {

        }
    }

    componentDidMount() {

    }

    /**
     * 隐藏真正的文件上传控件，通过按钮模拟点击文件上传控件
     */
    clickFile = () => {
        let file = document.getElementById("file")
        file.click();
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

            let data = {
                content: this.state.value,
                contentType: 3,
                fileSuffix: fileSuffix,
                file: u8
            }
            this.props.sendMessage(data)

            if (["jpeg", "jpg", "png", "gif", "tif", "bmp", "dwg"].indexOf(fileSuffix) !== -1) {
                this.props.appendImgToPanel(file)
            } else {
                this.props.appendMessage(<FileOutlined style={{ fontSize: 38 }} />)
            }

        })
        reader.readAsArrayBuffer(files[0])
    }

    render() {
        const { chooseUser } = this.props;
        return (
            <>
                <Tooltip title="上传图片或者文件">
                    <input type='file' id='file' onChange={this.uploadFile} hidden disabled={chooseUser.toUser === ''} />
                    <Button
                        onClick={this.clickFile}
                        shape="circle"
                        style={{ marginRight: 10 }}
                        icon={<FileAddOutlined />}
                        disabled={chooseUser.toUser === ''}
                    />
                </Tooltip>
            </>
        );
    }
}


function mapStateToProps(state) {
    return {
        user: state.userInfoReducer.user,
        chooseUser: state.panelReducer.chooseUser,
        messageList: state.panelReducer.messageList,
        socket: state.panelReducer.socket,
    }
}

function mapDispatchToProps(dispatch) {
    return {
        setMessageList: (data) => dispatch(actions.setMessageList(data)),
    }
}

ChatFile = connect(mapStateToProps, mapDispatchToProps)(ChatFile)

export default ChatFile