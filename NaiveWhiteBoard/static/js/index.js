// 画布
let canvas = new fabric.Canvas('board', {
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#f2f2f2",
});
fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.cornerColor = '#B2CCFF';
fabric.Object.prototype.cornerSize = 9;
fabric.Object.prototype.cornerStyle = 'circle';

// 从URL读白板名到输入框内
setBoardNameValue();

/* 功能 */
// 分享白板
let clipboard = new ClipboardJS('#share', {
    // 通过target指定要复印的节点
    text: function() {
        tip("已复制链接,快分享给好友吧!");
        return window.location.href;
    }
});
// 合并
$("#group").click(function () {
    if(!canvas.getActiveObject() || canvas.getActiveObject().type !== 'activeSelection') {
        return;
    }
    // 通知服务端删除被合体的元素
    for(let element of canvas.getActiveObjects()) {
        ws.sendMessage("removeElement", element.id);
    }
    let group = canvas.getActiveObject().toGroup();
    // Group操作实际上是将三个element合为一个新的element,所以需要重新给id和modify事件
    group.id = randId();
    group.on("modified", function () {
        // 通知服务端修改元素
        ws.sendMessage("modifyElement", group);
    });
    // 通知服务端添加合体元素
    ws.sendMessage("modifyElement", group);
    canvas.requestRenderAll();
});
// 画布自适应窗口大小
window.onresize = function () {
    canvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
    });
};
// 鼠标滚轮调整缩放
canvas.on('mouse:wheel', function (opt){
    let zoom = canvas.getZoom() * 0.999 ** opt.e.deltaY;
    if (zoom > 5) zoom = 5;
    if (zoom < 0.5) zoom = 0.5;
    // 以鼠标所在位置为原点缩放
    canvas.zoomToPoint({
            x: opt.e.offsetX,
            y: opt.e.offsetY,
        }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
});
// 阻止右键菜单
document.body.oncontextmenu = function(){
    return false;
};
// 右键拖拽移动画布
canvas.on('mouse:down:before', function(opt) {
    if(opt.e.button === 2) {
        this.isDragging = true;
        this.selection = false;
        this.lastPosX = opt.e.clientX;
        this.lastPosY = opt.e.clientY;
        this.setCursor("move");
    }
});
canvas.on('mouse:move', function(opt) {
    if (this.isDragging) {
        let e = opt.e;
        let vpt = this.viewportTransform;
        vpt[4] += e.clientX - this.lastPosX;
        vpt[5] += e.clientY - this.lastPosY;
        this.requestRenderAll();
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
        this.setCursor("move");
    }
});
canvas.on('mouse:up:before', function() {
    this.setViewportTransform(this.viewportTransform);
    this.isDragging = false;
    this.selection = true;
    this.setCursor("default");
});
// 删除键删除元素
document.onkeydown = function (e) {
    if(e.code === "Backspace") {
        if(canvas.getActiveObjects().length === 1 && canvas.getActiveObject().type === "i-text") {
            // 选中的文字区域,不执行删除
        } else {
            canvas.getActiveObjects().forEach(function (target) {
                canvas.remove(canvas.getElementById(target.id));
                ws.sendMessage("removeElement", target.id);
            });
            canvas.discardActiveObject(null);
        }
    }
};
// 根据ID获得某个元素
canvas.getElementById = function (id) {
    for(const element of canvas.getObjects()) {
        if(element.id === id) {
            return element;
        }
    }
    return null;
};
// 添加元素
canvas.addElement = function (type) {
    let ele;
    switch(type) {
        case "Rect":
            ele = new fabric.Rect();
            break;
        case "Circle":
            ele = new fabric.Circle({radius: 50});
            break;
        case "Triangle":
            ele = new fabric.Triangle();
            break;
        case "IText":
            ele = new fabric.IText("输入内容...");
            break;
    }
    ele.set({
        // 元素的固定ID
        "id": randId(),
        "stroke": "black",
        "width": 200,
        "height": 200,
        "left": window.innerWidth/2-100,
        "top": window.innerHeight/2-100,
        "fill": "",
        "strokeWidth": 2,
        // 不固定到中心会导致Circle的位置对不上
        "originX": "center",
        "originY": "center",
    });
    // 更改事件
    ele.on("modified", function () {
        // 通知服务端修改元素
        ws.sendMessage("modifyElement", ele);
    });
    // 通知服务端添加元素
    ws.sendMessage("modifyElement", ele);
    canvas.add(ele);
    canvas.setActiveObject(ele);
};
// 重绘画布
canvas.resetCanvas = function (data) {
    // 删除画布所有元素
    for(const ele of canvas.getObjects()) {
        canvas.remove(ele);
    }
    if(data != null) {
        // 遍历所有从服务器传来的Element,通过这些Element生成对象
        Object.values(data).forEach(function (element) {
            canvas.drawElement(element)
        });
    }
};
// 根据服务器传来的数据来添加/修改元素
canvas.drawElement = function (element) {
    let temp = fabric.util.getKlass(element["type"], "");
    temp.fromObject(element, function (ele) {
        if(canvas.getElementById(ele.id) !== null) {
            // 如果这个元素已存在,要删除之前那个
            canvas.remove(canvas.getElementById(ele.id));
        }
        // 更改事件
        ele.on("modified", function () {
            // 通知服务端修改元素
            ws.sendMessage("modifyElement", ele);
        });
        canvas.add(ele);
    });
}
// 下载当前页面配置
$("#downloadPage").click(function () {
    ws.sendMessage("downloadPage");
});
// 上传页面配置,点击上传Span后会打开隐藏的上传表单,表单改变时触发此函数
$("#uploadForm").change(function (e) {
    let reader = new FileReader();
    reader.readAsText(e.target.files[0]);
    reader.onload = function (e) {
        // 将JSON解析为后端的Page格式后传回
        let pageJson = e.target.result.toString();
        ws.sendMessage("uploadPage", JSON.parse(pageJson));
    }
    // 清空表单
    e.target.value = "";
});

/* WebSocket */
let ws;
initWebSocket();
// 初始化WebSocket,放在function中才能实现重连
function initWebSocket() {
    ws = new WebSocket("ws://" + window.location.host + "/connect");
    ws.onopen = function() {
        // 连接WebSocket成功,显示登录界面(mask默认显示)
        setLoginFormDisplay(true, true);
    };
    ws.onclose = function () {
        tip("服务器连接失败,请稍后重试~");
        setLoginFormDisplay(true, false);
        // 定时重连
        setTimeout(initWebSocket, 2500);
    };
    // 接受来自服务端的信息
    ws.onmessage = function(e) {
        let reply = JSON.parse(e.data)
        switch (reply["Action"]) {
            case "createWhiteBoard":
                // 创建白板的回复
                if(reply["Success"]) {
                    // 清空画布
                    canvas.resetCanvas();
                    // 创建成功,进入主界面
                    setLoginFormDisplay(false, false);
                    // Value为白板名称,修改当前URL用于分享
                    setUrl(reply["Value"])
                    tip("白板创建成功!");
                } else {
                    tip("白板已存在,您可加入该白板");
                }
                break;
            case "joinWhiteBoard":
                // 加入白板的回复
                if(reply["Success"]) {
                    // 加入成功,进入主界面
                    setLoginFormDisplay(false, false);
                    // Value为白板名称,修改当前URL用于分享
                    setUrl(reply["Value"]);
                    tip("加入白板成功!");
                } else {
                    tip("白板不存在,您可创建该白板");
                }
                break;
            case "modifyPage":
                // 服务端要求要求用户更新页面所有数据
                canvas.resetCanvas(reply["Value"]);
                break;
            case "modifyElement":
                // 服务端要求用户更新/添加某个元素
                canvas.drawElement(reply["Value"]);
                break;
            case "removeElement":
                // 服务端要求用户删除某个元素
                canvas.remove(canvas.getElementById(reply["Value"]));
                break;
            case "downloadPage":
                // 下载当前页面的配置
                let blob = new Blob([JSON.stringify(reply["Value"])]);
                downloadFileFromBlob(blob, "page.json");
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
// 发送创建白板请求
function createWhiteBoard() {
    let boardName = $("#boardName").val();
    if(boardName.length > 0) {
        ws.sendMessage("createWhiteBoard", boardName);
    } else {
        tip("请输入白板名称");
    }
}
// 发送加入白板请求
function joinWhiteBoard() {
    let boardName = $("#boardName").val();
    if(boardName.length > 0) {
        ws.sendMessage("joinWhiteBoard", boardName);
    } else {
        tip("请输入白板名称");
    }
}

/* 公用方法 */
// 推送底部提示
function tip(s) {
    document.querySelector("#toastBar").MaterialSnackbar.showSnackbar({
        message: s
    });
}
// 通过白板名称设置URL
function setUrl(boardName) {
    let newUrl = window.location.href.split("?")[0] + "?boardName=" + boardName;
    history.replaceState(null, null, newUrl);
}
// 通过GET参数设置白板名称输入框的内容
function setBoardNameValue() {
    let decode = decodeURI(window.location.href);
    let strs = decode.split("?boardName=");
    if(strs.length === 2) {
        // 如果没有boardName参数,长度只会为1
        $("#boardName").val(strs[1]);
    }
}
// 显示/隐藏mask和join页面
function setLoginFormDisplay(mask, join) {
    if(mask) {
        $(".mask").show();
    } else {
        $(".mask").hide();
    }
    if(join) {
        $(".join").show();
    } else {
        $(".join").hide();
    }
}
// 从Blob下载文件
function downloadFileFromBlob(blob, fileName) {
    let blobUrl = window.URL.createObjectURL(blob)
    let link = document.createElement('a')
    link.download = fileName
    link.style.display = 'none'
    link.href = blobUrl
    // 触发点击
    document.body.appendChild(link)
    link.click()
    // 移除
    document.body.removeChild(link)
}
// 生成随机ID
function randId() {
    return Math.floor(Math.random()*100000000)
}
