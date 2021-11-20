import React from 'react';
import {
    Button,
    Form,
    Input,
    message
} from 'antd';
import { axiosPostBody } from './util/Request';
import * as Params from './common/param/Params'

class Login extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
        }

    }

    componentDidMount() {

    }

    onFinish = (values) => {
        let data = {
            username: values.username,
            password: values.password
        }
        axiosPostBody(Params.LOGIN_URL, data)
            .then(response => {
                message.success("登录成功！");
                localStorage.username = response.data.username
                this.props.history.push("panel/" + response.data.uuid)
            });
    };

    onFinishFailed = (errorInfo) => {
        console.log('Failed:', errorInfo);
    };

    render() {

        return (
            <div>
                <Form
                    name="basic"
                    labelCol={{ span: 9 }}
                    wrapperCol={{ span: 6 }}
                    onFinish={this.onFinish}
                    onFinishFailed={this.onFinishFailed}
                    autoComplete="off"
                    style={{ marginTop: 150 }}
                >
                    <Form.Item
                        label="Username"
                        name="username"
                        rules={[{ required: true, message: 'Please input your username!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Password"
                        name="password"
                        rules={[{ required: true, message: 'Please input your password!' }]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item wrapperCol={{ offset: 9, span: 6 }}>
                        <Button type="primary" htmlType="submit">
                            Submit
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        );
    }
}

export default Login;