import React from 'react';
import {
    Avatar,
    Button,
    Dropdown,
    Menu,
    Modal,
    Upload,
    message
} from 'antd';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';

import { connect } from 'react-redux'
import { actions } from '../../../redux/module/userInfo'
import * as Params from '../../../common/param/Params'
import { axiosGet } from '../../../util/Request';

function getBase64(img, callback) {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result));
    reader.readAsDataURL(img);
}

function beforeUpload(file) {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
        message.error('You can only upload JPG/PNG file!');
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
        message.error('Image must smaller than 2MB!');
    }
    return isJpgOrPng && isLt2M;
}

class UserInfo extends React.Component {
    constructor(props) {
        super(props)
        let user = {}
        if (props.user) {
            user = props.user
        }
        this.state = {
            user: user,
            isModalVisible: false,
            loading: false,
            imageUrl: ''
        }
    }

    componentDidMount() {
        this.fetchUserDetails();
    }

    /**
     * 获取用户详情
     */
    fetchUserDetails = () => {
        axiosGet(Params.USER_URL + localStorage.uuid)
            .then(response => {
                let user = {
                    ...response.data,
                    avatar: Params.HOST + "/file/" + response.data.avatar
                }
                this.props.setUser(user)
            });
    }

    modifyAvatar = () => {
        this.setState({
            isModalVisible: true
        })
    }

    handleCancel = () => {
        this.setState({
            isModalVisible: false
        })
    }

    loginout = () => {
        this.props.history.push("/login")
    }

    handleChange = info => {
        if (info.file.status === 'uploading') {
            this.setState({ loading: true });
            return;
        }
        if (info.file.status === 'done') {
            let response = info.file.response
            if (response.code !== 0) {
                message.error(info.file.response.msg)
            }

            let user = {
                ...this.props.user,
                avatar: Params.HOST + "/file/" + info.file.response.data
            }
            this.props.setUser(user)
            // Get this url from response in real world.
            getBase64(info.file.originFileObj, imageUrl =>
                this.setState({
                    imageUrl,
                    loading: false,
                }),
            );
        }
    };


    render() {
        const menu = (
            <Menu>
                <Menu.Item key={1}>
                    <Button type='link'>{this.props.user.username}</Button>
                </Menu.Item>
                <Menu.Item key={2}>
                    <Button type='link' onClick={this.modifyAvatar}>更新头像</Button>
                </Menu.Item>
                <Menu.Item key={3}>
                    <Button type='link' onClick={this.loginout}>退出</Button>
                </Menu.Item>
            </Menu>
        );

        const { loading, imageUrl } = this.state;
        const uploadButton = (
            <div>
                {loading ? <LoadingOutlined /> : <PlusOutlined />}
                <div style={{ marginTop: 8 }}>Upload</div>
            </div>
        );
        return (
            <>
                <Dropdown overlay={menu} placement="bottomCenter" arrow>
                    <Avatar src={this.props.user.avatar} alt={this.props.user.username} />
                </Dropdown>

                <Modal title="更新头像" visible={this.state.isModalVisible} onCancel={this.handleCancel} footer={null}>
                    <Upload
                        name="file"
                        listType="picture-card"
                        className="avatar-uploader"
                        showUploadList={false}
                        action={Params.FILE_URL}
                        beforeUpload={beforeUpload}
                        onChange={this.handleChange}
                        data={{ uuid: this.props.user.uuid }}
                    >
                        {imageUrl ? <img src={imageUrl} alt="avatar" style={{ width: '100%' }} /> : uploadButton}
                    </Upload>
                </Modal>
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

UserInfo = connect(mapStateToProps, mapDispatchToProps)(UserInfo)

export default UserInfo