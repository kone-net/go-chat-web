## go-chat
使用Go基于WebSocket的通讯聊天软件。

### 功能列表：
* 登录注册
* 修改头像
* 群聊天
* 群好友列表
* 单人聊天
* 添加好友
* 添加群组
* 文本消息
* 剪切板图片
* 图片消息
* 文件发送
* 语音消息
* 视频消息
* 屏幕共享（基于图片）
* 视频通话（基于webrtc的p2p视频通话）

## 后端
[代码仓库](https://github.com/kone-net/go-chat)
go中协程是非常轻量级的。在每个client接入的时候，为每一个client开启一个协程，能够在单机实现更大的并发。同时go的channel，可以非常完美的解耦client接入和消息的转发等操作。

通过go-chat，可以掌握channel的和Select的配合使用，ORM框架的使用，web框架Gin的使用，配置管理，日志操作，还包括proto buffer协议的使用，等一些列项目中常用的技术。


### 后端技术和框架
* web框架Gin
* 长连接WebSocket
* 日志框架Uber的zap
* 配置管理viper
* ORM框架gorm
* 通讯协议Google的proto buffer
* makefile 的编写
* 数据库MySQL
* 图片文件二进制操作

## 前端
基于react,UI和基本组件是使用ant design。可以很方便搭建前端界面。

界面选择单页框架可以更加方便写聊天界面，比如像消息提醒，可以在一个界面接受到消息进行提醒，不会因为换页面或者查看其他内容影响消息接受。
[前端代码仓库](https://github.com/kone-net/go-chat-web)：
https://github.com/kone-net/go-chat-web


### 前端技术和框架
* React
* Redux状态管理
* AntDesign
* proto buffer的使用
* WebSocket
* 剪切板的文件读取和操作
* 聊天框发送文字显示底部
* FileReader对文件操作
* ArrayBuffer，Blob，Uint8Array之间的转换
* 获取摄像头视频（mediaDevices）
* 获取麦克风音频（Recorder）
* 获取屏幕共享（mediaDevices）
* WebRTC的p2p视频通话


### 截图
![go-chat-panel](/public/screenshot/go-chat-panel.jpeg)
