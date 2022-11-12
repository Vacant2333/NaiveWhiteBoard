// WebSocket连接
let ws;
// 持续获取在线人数的Timer
let userCountTimerId;
// 默认页面(不可被删除,默认加入该页面)
const defaultPage = "默认页面";

// 初始化WebSocket,放在function中才能实现重连
function initWebSocket() {
    ws = new WebSocket("ws://" + window.location.host + "/connect");
    ws.onopen = function() {
        // 连接WebSocket成功,显示登录界面(mask默认显示)
        setLoginFormDisplay(true, true);
    };
    ws.onerror = function () {
        // 出现错误或连接失败,尝试重连
        setTimeout(initWebSocket, 2500);
    }
    ws.onclose = function () {
        tip("服务器连接失败,请稍后重试~");
        setLoginFormDisplay(true, false);
        // 断开后清除定时器
        clearInterval(userCountTimerId);
        // 已断开,尝试重连
        setTimeout(initWebSocket, 2500);
    };
    // 接受来自服务端的信息
    ws.onmessage = function(e) {
        let msg = JSON.parse(e.data)
        switch (msg["Action"]) {
            case "createWhiteBoard":
                // 创建白板的回复
                if(msg["Success"]) {
                    // 清空画布
                    canvas.resetCanvas();
                    // 创建成功,进入主界面
                    setLoginFormDisplay(false, false);
                    // Value为白板名称,修改当前URL用于分享
                    setUrl(msg["Value"]);
                    startGetUserCountTimer();
                } else {
                    tip("白板已存在,您可加入该白板");
                }
                break;
            case "joinWhiteBoard":
                // 加入白板的回复
                if(msg["Success"]) {
                    // 加入成功,进入主界面
                    setLoginFormDisplay(false, false);
                    // Value为白板名称,修改当前URL用于分享
                    setUrl(msg["Value"]);
                    startGetUserCountTimer();
                } else {
                    tip("白板不存在,您可创建该白板");
                }
                break;
            case "modifyPage":
                // 服务端要求要求用户更新页面所有数据
                canvas.resetCanvas(msg["Value"]);
                break;
            case "modifyElement":
                // 服务端要求用户更新/添加某个元素
                canvas.drawElement(msg["Value"]);
                break;
            case "removeElement":
                // 服务端要求用户删除某个元素
                canvas.remove(canvas.getElementById(msg["Value"]));
                break;
            case "downloadPage":
                // 下载当前页面的配置
                downloadFile(msg["Value"], "page.json", true);
                break;
            case "lockBoard":
                // 锁定白板
                if(msg["Success"]) {
                    canvas.setLock(msg["Value"], true);
                } else {
                    // 操作锁定失败,不是创建者
                    tip("创建者才能设置锁定状态");
                }
                break;
            case "addPage":
                // 添加页面
                if(msg["Success"]) {
                    // 添加成功
                    addPage(msg["Value"]);
                } else {
                    tip("白板已锁定或名称已存在");
                }
                break;
            case "setPage":
                // 服务端要求切换页面(服务端发送setPage时会带上modifyPage)
                setActivePage(msg["Value"]);
                break;
            case "removePage":
                // 删除页面
                if(msg["Success"]) {
                    removePage(msg["Value"]);
                } else {
                    tip("删除失败,白板已锁定或尝试删除默认页面");
                }
                break;
            case "getUserCount":
                // 获得在线人数的回复
                $("#userCount").text(msg["Value"]);
                break;
        }
    };
    // 给服务端发送信息
    ws.sendMessage = function (action, value) {
        ws.send(JSON.stringify({
            "Action": action,
            "Value": value,
        }));
    };
}
// 启动持续获取在线人数计时器
function startGetUserCountTimer() {
    // 页面可能断开连接后重连,要重启计时器
    clearInterval(userCountTimerId);
    userCountTimerId = setInterval(function () {
        ws.sendMessage("getUserCount");
    }, 500);
}