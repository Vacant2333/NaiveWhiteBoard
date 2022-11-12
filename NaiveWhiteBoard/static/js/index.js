// 自定义区
let customize = $("#customize");
// 铅笔格式区
let pencilCustomize = $("#pencilCustomize");
// 初始化
$(document).ready(function () {
    // 从URL读白板名称到输入框内
    setBoardNameValue();
    // 清空顶部Page栏
    clearPages();
    // 建立WebSocket连接
    initWebSocket();
    // 分享按钮
    new ClipboardJS('#share', {
        // 通过target指定要复印的节点
        text: function() {
            tip("已复制链接,快分享给好友吧!");
            return window.location.href;
        }
    });
});
// 下载白板图片
$("#downloadImg").click(function () {
    downloadFile(canvas.toSVG(), "page.svg", false);
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
// 修改填充色
$("#fillColor").change(function (e) {
    updateElementStyle("fill", e.target.value);
});
// 修改边框颜色
$("#stroke").change(function (e) {
    updateElementStyle("stroke", e.target.value);
});
// 修改背景颜色
$("#backgroundColor").change(function (e) {
    updateElementStyle("backgroundColor", e.target.value);
});
// 修改边框粗细
$("#strokeWidth").change(function (e) {
    updateElementStyle("strokeWidth", parseInt(e.target.value));
});
// 修改透明度
$("#opacity").change(function (e) {
    updateElementStyle("opacity", parseInt(e.target.value)/100);
});
// 开/关铅笔模式
function pencilMode() {
    if(canvas.isLock() && canvas.isDrawingMode === false) {
        tip("白板已锁定");
        return;
    }
    let pencil = $("#pencil");
    customize.hide(500);
    if(canvas.isDrawingMode) {
        pencil.removeClass("select");
        pencilCustomize.hide(500);
    } else {
        pencil.addClass("select");
        pencilCustomize.show(500);
    }
    canvas.isDrawingMode = !canvas.isDrawingMode
}
// 修改铅笔颜色
$("#pencilColor").change(function (e) {
    canvas.freeDrawingBrush.color = e.target.value;
});
// 修改铅笔粗细
$("#pencilWidth").change(function (e) {
    canvas.freeDrawingBrush.width = parseInt(e.target.value);
});
// 右下角帮助
$("#help").click(function () {
    tip("退格键删除元素,Ctrl+C/Command+C复制,Ctrl+V/Command+V粘贴,右键移动画布,滚轮缩放画布.");
});
// 加入白板按钮
$("#joinWhiteBoard").click(function () {
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
});
// 创建白板按钮
$("#createWhiteBoard").click(function () {
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
});

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
function downloadFile(data, fileName, toJSON) {
    if(toJSON) {
        data = JSON.stringify(data);
    }
    let blobUrl = window.URL.createObjectURL(new Blob([data]));
    let link = document.createElement("a");
    link.download = fileName;
    link.style.display = "none";
    link.href = blobUrl;
    // 触发点击
    document.body.appendChild(link);
    link.click();
    // 移除临时元素
    document.body.removeChild(link);
}
// 生成随机ID
function randId() {
    return Math.floor(Math.random() * 100000000);
}
// fabric.js自带的toJSON会丢失cache信息导致不同步,所以这里手动把所有数据拿出来存入一个map
function objToMap(obj) {
    let entries = Object.entries(obj);
    let map = {};
    for(let index in entries) {
        if(entries[index][0] !== "canvas" && entries[index][0] !== "group" && entries[index][0] !== "__eventListeners" && entries[index][0] !== "_cacheCanvas") {
            map[entries[index][0]] = entries[index][1];
        }
    }
    map["type"] = obj.get("type");
    return map;
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
function checkName(s) {
    let pattern = new RegExp("[`@#$^&*(){}':;,\\[\\].<>《》/?~！￥…（）—|【】‘；：”“。，、？ ]")
    return pattern.test(s);
}
// 更新自定义区的内容(选中元素后)
function updateCustomize(obj) {
    $("#fillColor").val(obj.get("fill") ? obj.get("fill") : "#ffffff");
    $("#stroke").val(obj.get("stroke") ? obj.get("stroke") : "#ffffff");
    $("#backgroundColor").val(obj.get("backgroundColor") ? obj.get("backgroundColor") : "#ffffff");
    // 必须通过MaterialSlider修改,不然进度条不会变
    document.getElementById("strokeWidth").MaterialSlider.change(obj.get("strokeWidth"));
    document.getElementById("opacity").MaterialSlider.change(obj.get("opacity")*100);
}
// 修改元素样式
function updateElementStyle(key, value) {
    let obj = canvas.getActiveObject();
    if(obj != null) {
        obj.set(key, value);
        ws.sendMessage("modifyElement", obj);
        canvas.requestRenderAll();
    }
}