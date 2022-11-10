const defaultPage = "默认页面";
// 自定义区(默认隐藏)
let customize = $(".customize");
customize.toggle();
// 粘贴板
let clipboard;
// 初始化画布
let canvas;
// WebSocket连接
let ws;
// 初始化
$(document).ready(function () {
    // 从URL读白板名到输入框内
    setBoardNameValue();
    // 清空顶部Page栏
    clearPages();
    // 建立WebSocket连接
    initWebSocket();
});
// 初始化画布
canvas = new fabric.Canvas('board', {
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#f2f2f2",
    stopContextMenu: true, // 屏蔽右键
});
fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.cornerColor = '#B2CCFF';
fabric.Object.prototype.cornerSize = 9;
fabric.Object.prototype.cornerStyle = 'circle';
fabric.Object.prototype.objectCaching = false;

/* 功能 */
// 分享白板
new ClipboardJS('#share', {
    // 通过target指定要复印的节点
    text: function() {
        tip("已复制链接,快分享给好友吧!");
        return window.location.href;
    }
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
// 建立多选时状态改变时同步
canvas.on('selection:created', function () {
    let group = canvas.getActiveObject();
    if(group != null && group._objects != null && group._objects.length > 1) {
        // 选中了多个元素,建立多选时给多选对象添加改变事件
        group.on("modified", function () {
            for(let ele of canvas.getActiveObjects()) {
                ws.sendMessage("modifyElement", objToMap(ele));
            }
        });
    } else if(group != null && group.id != null) {
        // 选中的是单个元素
        customize.toggle(500);
    }
});
// 取消选中
canvas.on("before:selection:cleared", function () {
    let group = canvas.getActiveObject();
    if(group != null && group.id != null) {
        // 选中的是单个元素
        customize.toggle(500);
    }
});
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
    if(this.isDragging) {
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
            canvas.discardActiveObject();
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
    if(canvas.isLock()) {
        tip("白板已锁定");
        return;
    }
    let ele;
    switch(type) {
        case "Line":
            ele = new fabric.Line();
            break;
        case "Circle":
            ele = new fabric.Circle({radius: 50});
            break;
        case "Rect":
            ele = new fabric.Rect();
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
    setModifyEvent(ele, false);
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
    // 设置已锁定
    canvas.setLock(canvas.isLock(), false);
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
        setModifyEvent(ele, false);
        if(ele.matrixCache != null) {
            ele.left = ele.matrixCache.value[4]
            ele.top = ele.matrixCache.value[5]
        }
        canvas.add(ele);
    });
}
// 设置锁定
canvas.setLock = function (lock, sendTip) {
    for(let ele of canvas.getObjects()) {
        // 根据锁定设置是否可选中
        ele.selectable = !lock
    }
    if(lock) {
        $("#lock").text("lock");
        if(sendTip) {
            tip("白板已锁定");
        }
        // 清空已选内容
        canvas.discardActiveObject();
    } else {
        $("#lock").text("lock_open");
        if(sendTip) {
            tip("白板已解锁");
        }
    }
    canvas.requestRenderAll();
}
// 是否已锁
canvas.isLock = function () {
    return $("#lock").text() === "lock";
}
// 下载白板图片
$("#downloadImg").click(function () {
    downloadFileFromBlob(canvas.toSVG(), "page.svg", false);
});
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
// 上传按钮
$("#uploadPage").click(function () {
    if(canvas.isLock()) {
        // 已锁定,不允许上传
        tip("白板已锁定");
    } else {
        $('#uploadForm').click()
    }
});
// 全屏/取消全屏
$("#fullscreen").click(function () {
    if(document.fullscreenElement == null) {
        // 为null,不是全屏状态,请求全屏
        document.documentElement.requestFullscreen().then(function () {
            $("#fullscreen").text("fullscreen_exit");
        });
    } else {
        // 不为null,请求退出全屏
        document.exitFullscreen().then(function () {
            $("#fullscreen").text("fullscreen");
        });
    }
});
// 用户请求设定锁定模式
$("#lock").click(function () {
    // 如果目前是Lock状态,value就是False,也就是解锁,如果不是,就是锁定
    ws.sendMessage("lockBoard", $("#lock").text() !== "lock")
});
// 用户请求添加新页面
$("#add_page").click(function () {
    let name = prompt("请输入新页面的名称:");
    if(name !== null && name !== "") {
        if(!checkName(name)) {
            ws.sendMessage("addPage", name.toString());
        } else {
            // 字符串验证失败
            tip("名称不可以包含特殊字符,可包含!_-");
        }
    }
});
// 复制
document.oncopy = function () {
    // 将复制的对象保存
    canvas.getActiveObject().clone(function(cloned) {
        clipboard = cloned;
    });
};
// 粘贴
document.onpaste = function () {
    if(canvas.isLock()) {
        tip("白板已锁定");
        return;
    }
    clipboard.clone(function(clonedObj) {
        canvas.discardActiveObject();
        clonedObj.set({
            left: clonedObj.left + 20,
            top: clonedObj.top + 20,
            evented: true,
        });
        if(clonedObj.type === 'activeSelection') {
            // 复制的是一组对象
            clonedObj.canvas = canvas;
            clonedObj.forEachObject(function(obj) {
                // 需要新给一个ID,不然会覆盖
                obj.id = randId();
                canvas.add(obj);
                ws.sendMessage("modifyElement", obj);
            });
            clonedObj.setCoords();
        } else {
            // 复制的是单个对象,需要新给一个ID,不然会覆盖
            clonedObj.id = randId();
            setModifyEvent(clonedObj, false);
            canvas.add(clonedObj);
            ws.sendMessage("modifyElement", clonedObj);
        }
        clipboard.top += 20;
        clipboard.left += 20;
        canvas.setActiveObject(clonedObj);
        canvas.requestRenderAll();
    });
};
// 修改填充色
$("#fillColor").change(function (e) {
    let actionObj = canvas.getActiveObject();
    if(actionObj != null) {
        actionObj.setOptions({
            fill: e.target.value,
        });
        ws.sendMessage("modifyElement", actionObj);
        canvas.requestRenderAll();
    }
});


/* WebSocket */
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
        setTimeout(initWebSocket, 2000);
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
                    setUrl(reply["Value"]);
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
                downloadFileFromBlob(reply["Value"], "page.json", true);
                break;
            case "lockBoard":
                // 锁定白板
                if(reply["Success"]) {
                    canvas.setLock(reply["Value"], true);
                } else {
                    // 操作锁定失败,不是创建者
                    tip("创建者才能设置锁定状态");
                }
                break;
            case "addPage":
                // 添加页面
                if(reply["Success"]) {
                    // 添加成功
                    addPage(reply["Value"]);
                } else {
                    tip("白板已锁定或名称已存在");
                }
                break;
            case "setPage":
                // 服务端要求切换页面(服务端发送setPage时会带上modifyPage)
                setActivePage(reply["Value"]);
                break;
            case "removePage":
                // 删除页面
                if(reply["Success"]) {
                    removePage(reply["Value"]);
                } else {
                    tip("删除失败,白板已锁定或尝试删除默认页面");
                }
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
        if(!checkName(boardName)) {
            ws.sendMessage("createWhiteBoard", boardName);
        } else {
            tip("名称不可以包含特殊字符,可包含!_-");
        }
    } else {
        tip("请输入白板名称");
    }
}
// 发送加入白板请求
function joinWhiteBoard() {
    let boardName = $("#boardName").val();
    if(boardName.length > 0) {
        if(!checkName(boardName)) {
            ws.sendMessage("joinWhiteBoard", boardName);
        } else {
            tip("名称不可以包含特殊字符,可包含!_-");
        }
    } else {
        tip("请输入白板名称");
    }
}

/* 公用方法 */
// 推送底部提示
function tip(s) {
    document.querySelector("#toastBar").MaterialSnackbar.showSnackbar({
        message: s,
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
// 下载文件
function downloadFileFromBlob(data, fileName, toJSON) {
    if(toJSON) {
        data = JSON.stringify(data);
    }
    let blobUrl = window.URL.createObjectURL(new Blob([data]))
    let link = document.createElement("a")
    link.download = fileName
    link.style.display = "none"
    link.href = blobUrl
    // 触发点击
    document.body.appendChild(link)
    link.click()
    // 移除临时元素
    document.body.removeChild(link)
}
// 生成随机ID
function randId() {
    return Math.floor(Math.random() * 100000000)
}
// fabric.js自带的toJSON会丢失cache信息导致不同步,所以这里
// 手动把所有数据拿出来存入一个map
function objToMap(obj) {
    let entries = Object.entries(obj);
    let map = {};
    for(let index in entries) {
        if(entries[index][0] !== "canvas" && entries[index][0] !== "group" && entries[index][0] !== "__eventListeners" && entries[index][0] !== "_cacheCanvas") {
            map[entries[index][0]] = entries[index][1]
        }
    }
    map["type"] = obj.get("type")
    return map
}
// 设置element的modify事件
function setModifyEvent(obj, toMap) {
    if(obj.__eventListeners != null) {
        obj.__eventListeners["modified"] = null
    }
    obj.on("modified", function () {
        // 通知服务端修改元素
        if(toMap) {
            ws.sendMessage("modifyElement", objToMap(obj));
        } else {
            ws.sendMessage("modifyElement", obj);
        }
    });
}
// 添加页面按钮
function addPage(name) {
    // name作为page的id和page-name的text
    let pageHtml = "<div class='page' id='"+name+"'>" +
        "              <span class='page-name'>"+name+"</span>" +
        "              <span class='page-close material-symbols-outlined'>close</span>" +
        "           </div>";
    if($("#"+name).length === 0) {
        // 添加该元素到 添加页面按钮 之前
        $("#add_page").before(pageHtml);
        let children = $("#"+name).children();
        // 切换页面
        children[0].onclick = function () {
            ws.sendMessage("setPage", name.toString());
        }
        // 删除页面
        children[1].onclick = function () {
            ws.sendMessage("removePage", name.toString());
        }
    }
}
// 设置当前页面
function setActivePage(name) {
    // 设置顶部标签
    for(let pageEle of $(".page")) {
        pageEle.classList.remove("page-select");
        if(pageEle.id === name) {
            pageEle.classList.add("page-select");
        }
    }
    canvas.discardActiveObject();
    // 不能在这里设置锁定状态,页面数据还没到
}
// 清空顶部Page栏
function clearPages() {
    for(let pageEle of $(".page")) {
        pageEle.remove();
    }
}
// 删除页面
function removePage(name) {
    for(let pageEle of $(".page")) {
        if(pageEle.id === name) {
            if(pageEle.classList.contains("page-select")) {
                // 如果被删除的是当前页面,转为默认页面
                ws.sendMessage("setPage", defaultPage);
            }
            pageEle.remove();
        }
    }
}
// 检查字符串(创建白板/添加页面)
function checkName(s)
{
    let pattern = new RegExp("[`@#$^&*(){}':;,\\[\\].<>《》/?~！￥…（）—|【】‘；：”“。，、？ ]")
    return pattern.test(s);
}