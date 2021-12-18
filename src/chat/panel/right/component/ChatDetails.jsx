import React from 'react';
import {
    Avatar,
    Drawer,
    List,
    Badge,
    Card,
    Comment
} from 'antd';

import {
    MoreOutlined,
} from '@ant-design/icons';

import InfiniteScroll from 'react-infinite-scroll-component';
import { connect } from 'react-redux'
import { actions } from '../../../redux/module/panel'
import * as Params from '../../../common/param/Params'
import { axiosGet } from '../../../util/Request';

const CommentList = ({ comments }) => (
    <InfiniteScroll
        dataLength={comments.length}
        scrollableTarget="scrollableDiv"
    >
        <List
            dataSource={comments}
            itemLayout="horizontal"
            renderItem={props => <Comment {...props} />}
        />
    </InfiniteScroll>
);

class ChatDetails extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            groupUsers: [],
            drawerVisible: false,
            messageList: []
        }
    }

    static getDerivedStateFromProps(nextProps, preState) {
        if (nextProps.messageList !== preState.messageList) {
            return {
                ...preState,
                messageList: nextProps.messageList,
            }
        }
        return null;
    }

    componentDidUpdate(prevProps) {
        if (prevProps.messageList !== this.state.messageList) {
            this.scrollToBottom();
        }
    }

    componentDidMount() {

    }

    /**
     * 发送消息或者接受消息后，滚动到最后
     */
    scrollToBottom = () => {
        let div = document.getElementById("scrollableDiv")
        div.scrollTop = div.scrollHeight
    }

    /**
     * 获取群聊信息，群成员列表
     */
    chatDetails = () => {
        axiosGet(Params.GROUP_USER_URL + this.props.chooseUser.toUser)
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


    render() {

        return (
            <>

                <Badge.Ribbon text={<MoreOutlined onClick={this.chatDetails} />}>

                    <Card title={this.props.chooseUser.toUsername} size="larg">
                        <div
                            id="scrollableDiv"
                            style={{
                                height: document.body.scrollHeight / 3 * 1.4,
                                overflow: 'auto',
                                padding: '0 16px',
                                border: '0px solid rgba(140, 140, 140, 0.35)',
                            }}
                        >
                            {this.props.messageList.length > 0 && <CommentList comments={this.props.messageList} />}

                        </div>
                    </Card>

                </Badge.Ribbon>
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
            </>
        );
    }
}


function mapStateToProps(state) {
    return {
        chooseUser: state.panelReducer.chooseUser,
        messageList: state.panelReducer.messageList,
    }
}

function mapDispatchToProps(dispatch) {
    return {
        setUser: (data) => dispatch(actions.setUser(data)),
    }
}

ChatDetails = connect(mapStateToProps, mapDispatchToProps)(ChatDetails)

export default ChatDetails