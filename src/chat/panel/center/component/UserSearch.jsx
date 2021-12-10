import React from 'react';
import {
    Row,
    Button,
    Col,
    Menu,
    Modal,
    Dropdown,
    Input,
    Form,
    message
} from 'antd';
import { PlusCircleOutlined } from '@ant-design/icons';

import { connect } from 'react-redux'
import { actions } from '../../../redux/module/panel'
import * as Params from '../../../common/param/Params'
import { axiosGet, axiosPostBody } from '../../../util/Request';


class UserSearch extends React.Component {
    groupForm = React.createRef();
    constructor(props) {
        super(props)
        this.state = {
            showCreateGroup: false,
            hasUser: false,
            queryUser: {
                username: '',
                nickname: '',
            },
        }
    }

    componentDidMount() {

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

    addUser = () => {
        let data = {
            uuid: localStorage.uuid,
            friendUsername: this.state.queryUser.username
        }
        axiosPostBody(Params.USER_FRIEND_URL, data)
            .then(_response => {
                message.success("添加成功")
                // this.fetchUserList()
                this.setState({
                    hasUser: false
                });
            });
    };

    joinGroup = () => {
        // /group/join/:userUid/:groupUuid
        axiosPostBody(Params.GROUP_JOIN_URL + localStorage.uuid + "/" + this.state.queryUser.groupUuid)
            .then(_response => {
                message.success("添加成功")
                // this.fetchUserList()
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

    showCreateGroup = () => {
        this.setState({
            showCreateGroup: true
        });
    }

    handleCancelGroup = () => {
        this.setState({
            showCreateGroup: false
        });
    }

    /**
     * 创建群
     */
    createGroup = () => {
        console.log(this.groupForm.current.getFieldValue())
        let values = this.groupForm.current.getFieldValue();
        let data = {
            name: values.groupName
        }

        axiosPostBody(Params.GROUP_LIST_URL + "/" + localStorage.uuid, data)
            .then(_response => {
                message.success("添加成功")
                this.setState({
                    showCreateGroup: false
                });
            });
    }

    render() {
        const menu = (
            <Menu>
                <Menu.Item key={1}>
                    <Button type='link' onClick={this.showModal}>添加用户</Button>
                </Menu.Item>
                <Menu.Item key={2}>
                    <Button type='link' onClick={this.showModal}>添加群</Button>
                </Menu.Item>
                <Menu.Item key={3}>
                    <Button type='link' onClick={this.showCreateGroup}>创建群</Button>
                </Menu.Item>
            </Menu>
        );

        return (
            <>
                <Row>
                    <Col span={20} >
                        <Input.Group compact>
                            <Input.Search allowClear style={{ width: '100%' }} onSearch={this.searchUser} />
                        </Input.Group>
                    </Col>
                    <Col>
                        <Dropdown overlay={menu} placement="bottomCenter" arrow>
                            <PlusCircleOutlined style={{ fontSize: 22, color: 'gray', marginLeft: 3, marginTop: 5 }} />
                        </Dropdown>
                    </Col>
                </Row>


                <Modal title="用户信息" visible={this.state.hasUser} onCancel={this.handleCancel} okText="添加用户" footer={null}>
                    <Input.Group compact>
                        <Input.Search allowClear style={{ width: '100%' }} onSearch={this.searchUser} />
                    </Input.Group>
                    <br /><hr /><br />

                    <p>用户名：{this.state.queryUser.username}</p>
                    <p>昵称：{this.state.queryUser.nickname}</p>
                    <Button type='primary' onClick={this.addUser} disabled={this.state.queryUser.username == null || this.state.queryUser.username === ''}>添加用户</Button>
                    <br /><br /><hr /><br /><br />

                    <p>群信息：{this.state.queryUser.groupName}</p>
                    <Button type='primary' onClick={this.joinGroup} disabled={this.state.queryUser.groupUuid == null || this.state.queryUser.groupUuid === ''}>添加群</Button>
                </Modal>

                <Modal title="创建群" visible={this.state.showCreateGroup} onCancel={this.handleCancelGroup} onOk={this.createGroup} okText="创建群">
                    <Form
                        name="groupForm"
                        ref={this.groupForm}
                        layout="vertical"
                        autoComplete="off"
                    >
                        <Form.Item
                            name="groupName"
                            label="群名称"
                            rules={[{ required: true }]}
                        >
                            <Input placeholder="群名称" />
                        </Form.Item>
                    </Form>

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

UserSearch = connect(mapStateToProps, mapDispatchToProps)(UserSearch)

export default UserSearch