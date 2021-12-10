import React from 'react';
import SwitchChat from './component/SwitchChat'
import UserInfo from './component/UserInfo'

export default class LeftIndex extends React.Component {

    render() {

        return (
            <>
                <UserInfo history={this.props.history} />
                <SwitchChat />
            </>
        );
    }
}
