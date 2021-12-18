import React from 'react';
import {
    Button,
} from 'antd';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';

import { connect } from 'react-redux'
import { actions } from '../../../redux/module/panel'
import * as Params from '../../../common/param/Params'
import { axiosGet } from '../../../util/Request';


class SwitchChat extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            menuType: 1,
        }
    }

    componentDidMount() {
        this.fetchUserList();
    }

    /**
     * 获取好友列表
     */
    fetchUserList = () => {
        this.setState({
            menuType: 1,
        })
        let data = {
            uuid: localStorage.uuid
        }
        axiosGet(Params.USER_LIST_URL, data)
            .then(response => {
                let users = response.data
                let data = []
                for (var index in users) {
                    let d = {
                        hasUnreadMessage: false,
                        username: users[index].username,
                        uuid: users[index].uuid,
                        messageType: 1,
                        avatar: Params.HOST + "/file/" + users[index].avatar,
                    }
                    data.push(d)
                }

                this.props.setUserList(data);
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
            uuid: localStorage.uuid
        }
        axiosGet(Params.GROUP_LIST_URL + "/" + localStorage.uuid, data)
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

                this.props.setUserList(data);
            })
    }

    render() {
        const { menuType } = this.state
        return (
            <div style={{marginTop: 25}}>
                <p >
                    <Button
                        icon={<UserOutlined />}
                        size="large"
                        type='link'
                        disabled={menuType === 1}
                        onClick={this.fetchUserList}
                        style={{color: menuType === 1 ? '#1890ff' : 'gray'}}
                    >
                    </Button>
                </p>
                <p onClick={this.fetchGroupList}>
                    <Button
                        icon={<TeamOutlined />}
                        size="large"
                        type='link'
                        disabled={menuType === 2}
                        style={{color: menuType === 2 ? '#1890ff' : 'gray'}}
                    >
                    </Button>
                </p>
            </div>
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
        setUserList: (data) => dispatch(actions.setUserList(data)),
    }
}

SwitchChat = connect(mapStateToProps, mapDispatchToProps)(SwitchChat)

export default SwitchChat