import React from 'react';
import {
    List,
    Badge,
    Avatar,
} from 'antd';
import {
    FileOutlined,
} from '@ant-design/icons';

import moment from 'moment';
import { connect } from 'react-redux'
import { actions } from '../../../redux/module/panel'
import * as Params from '../../../common/param/Params'
import { axiosGet } from '../../../util/Request';


class UserList extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            chooseUser: {}
        }
    }

    componentDidMount() {
    }

    /**
     * 选择用户，获取对应的消息
     * @param {选择的用户} value 
     */
    chooseUser = (value) => {
        let chooseUser = {
            toUser: value.uuid,
            toUsername: value.username,
            messageType: value.messageType,
            avatar: value.avatar
        }
        this.fetchMessages(chooseUser);
    }

    /**
     * 获取消息
     */
    fetchMessages = (chooseUser) => {
        const { messageType, toUser, toUsername } = chooseUser
        let uuid = localStorage.uuid
        if (messageType === 2) {
            uuid = toUser
        }
        let data = {
            Uuid: uuid,
            FriendUsername: toUsername,
            MessageType: messageType
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

                this.props.setMessageList(comments);
                // 设置选择的用户信息时，需要先设置消息列表，防止已经完成了滑动到底部动作后，消息才获取完成，导致消息不能完全滑动到底部
                this.props.setChooseUser(chooseUser);
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


    render() {

        return (
            <>
                <List
                    itemLayout="horizontal"
                    dataSource={this.props.userList}
                    renderItem={item => (
                        <List.Item>
                            <List.Item.Meta
                                style={{ paddingLeft: 30 }}
                                onClick={() => this.chooseUser(item)}
                                avatar={<Badge dot={true}><Avatar src={item.avatar} /></Badge>}
                                title={item.username}
                                description=""
                            />
                        </List.Item>
                    )}
                />
            </>
        );
    }
}


function mapStateToProps(state) {
    return {
        chooseUser: state.panelReducer.chooseUser,
        userList: state.panelReducer.userList,
    }
}

function mapDispatchToProps(dispatch) {
    return {
        setChooseUser: (data) => dispatch(actions.setChooseUser(data)),
        setUserList: (data) => dispatch(actions.setUserList(data)),
        setMessageList: (data) => dispatch(actions.setMessageList(data)),
    }
}

UserList = connect(mapStateToProps, mapDispatchToProps)(UserList)

export default UserList