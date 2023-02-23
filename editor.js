const canvas = document.getElementById("canvas");
const ctx = canvas.getContext('2d');
const modeDom = document.getElementById("mode");
const sideDom = document.getElementById("side");
let rect = canvas.getBoundingClientRect();

////
const fcDom = document.getElementById("fc"),
    scDom = document.getElementById("sc"),
    xDom = document.getElementById("x"),
    yDom = document.getElementById("y"),
    widthDom = document.getElementById("w"),
    heightDom = document.getElementById("h");

//// 多边形
class Polygon {

    tpe = "polygon";

    constructor(sides, fillColor, x, y, width, height) {
        this.sides = sides || 3;
        this.fillColor = fillColor || "#8c2c8c";
        this.strokeColor = "#000000";
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    set(key, value) {
        this[key] = value;
    }
    get(key) {
        const result = this[key];
        return result === undefined ? null: result;
    }
    setRect(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    }
    setSides(sides) {
        this.sides = sides
    }
    _drawPath() {
        // ctx.strokeRect(this.x, this.y, this.width, this.height);
        // 移动
        ctx.translate(this.x, this.y)
        const r = Math.max(this.width / 2);
        // 缩放
        ctx.scale(this.width / (2*r), this.height / (2*r))
        // 绘制路径
        ctx.beginPath()
        ctx.moveTo(r+ r, r);
        for (let i=0; i<this.sides; i++) {
            const angle = i/this.sides * (2*Math.PI)
            ctx.lineTo(r + r * Math.cos(angle),r + r*Math.sin(angle));
        }
        ctx.closePath()
        // ctx.translate(this.width, this.height)
    }
    fill() {
        ctx.save()
        this._drawPath()
        ctx.fillStyle = this.fillColor;
        ctx.fill()
        ctx.restore()
    }
    stroke() {
        ctx.save()
        this._drawPath()
        ctx.strokeStyle = this.strokeColor;
        ctx.stroke()
        ctx.restore()
    }
    draw() {
        ctx.save()
        this._drawPath()
        ctx.fillStyle = this.fillColor;
        ctx.fill();
        ctx.stroke();
        ctx.restore()
    }
    clear() {
        ctx.clearRect(this.x, this.y, this.width, this.height)
    }
}
////

// 三次贝塞尔曲线
class Bezier {
    type = "bezier";
    fillColor = "#000000";
    strokeColor = "#000000";

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    setXY(x, y) {
        this.x = x;
        this.y = y;
    }
    set(x1, y1, x2, y2, x3, y3) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.x3 = x3;
        this.y3 = y3;
        this.width = this.x3 - this.x;
        this.height = this.y3 -this.y;
    }
    setC(p, v) {
        this[p] = v;
        if (p === "x3" || p === "x") {
            this.width = this.x3 - this.x;
        } else if (p === "y3" || p==="y") {
            this.height = this.y3 -this.y;
        }
    }
    _drawPath() {
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.bezierCurveTo(this.x1, this.y1, this.x2, this.y2, this.x3, this.y3);
    }
    stroke() {
        ctx.save();
        this._drawPath();
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }
    fill() {
        this.stroke();
    }
    draw() {
        this.stroke()
    }
}

let mode = 0, sides = 3;
let isDragging = false, loc = {};
let dragDirection = null;
// 图形列表，顺序表示绘制顺序和层次
const shapes = [];
// 当前操作类型，0表示多边形，1表示贝塞尔
let shapeType = 0;
let cIndex;
document.getElementsByName("graphType").forEach(ele => {
    ele.onchange = function() {
        switch(ele.value) {
            case "polygon":
                shapeType = 0;
                break;
            case "bezier":
                shapeType = 1;
                break;
        }
    }
});

modeDom.onchange = (e) => {
    mode = parseInt(modeDom.value)
}
sideDom.onchange = () => {
    sides = parseInt(sideDom.value)
}

let curPolygon = null, cur = null, cx = 0, cy = 0;

function drawAll(filter, control) {
    shapes.forEach(shape => {
        if (filter && filter.call(this, shape) || !filter) {
            shape.draw()
        }
    })
    if (curPolygon instanceof Bezier) {
        function _drawControlPath(index) {
            ctx.beginPath();
            const x = curPolygon["x"+index], y = curPolygon["y" + index]
            ctx.rect(x-5, y-5, 10, 10);
        }
        function draw() {
            ctx.save();
            _drawControlPath(1);
            ctx.fillStyle = "#ff0000";
            ctx.fill();
            _drawControlPath(2);
            ctx.fillStyle = "#00ff00";
            ctx.fill();
            _drawControlPath(3);
            ctx.fillStyle = "#0000ff";
            ctx.fill();
            ctx.restore();
        }
        ctx.lineWidth = 10;
        if (!control || control && control.call(this, _drawControlPath)) {
            ctx.lineWidth = 1;
            draw();
        }
        ctx.lineWidth = 1;
    }
}
function setter(shape) {
    if (!shape) {
        return
    }
    fcDom.value = shape.fillColor;
    scDom.value = shape.strokeColor;
    xDom.value = shape.x;
    yDom.value = shape.y;
    widthDom.value = shape.width;
    heightDom.value = shape.height;
}

window.onresize = function () {
    rect = canvas.getBoundingClientRect()
}

// 鼠标按下
canvas.onmousedown = (e) => {
    isDragging = true;
    cIndex = null;
    // 初始坐标
    loc.x = e.clientX - rect.left;
    loc.y = e.clientY - rect.top;
    // 编辑和移动模式
    if (mode === 1 || mode === 2) {
        if (dragDirection) {
            return;
        }
        let curShape = null;
        drawAll((shape) => {
            ctx.save()
            shape._drawPath();
            // 每次描绘路径后，使用isPointInPath判断鼠标是否在路径上，isPointInStroke判断是否在描边上
            if (shape instanceof Polygon && ctx.isPointInPath(loc.x, loc.y) || shape instanceof Bezier && ctx.isPointInStroke(loc.x, loc.y)) {
                curPolygon = curShape = shape;
                // 按下时的偏移量
                cx = loc.x - shape.x;
                cy = loc.y - shape.y;
            }
            ctx.restore()

            return false;
        }, (_drawControlPath) => {
            for (let i=1; i<=3; i++) {
                _drawControlPath(i);
                if (ctx.isPointInPath(loc.x, loc.y)) {
                    cIndex = i;
                }
            }
        });
        if (!curShape && !cIndex) {
            curPolygon = cur = null;
        } else {
           setter(curShape);
        }
    }
}

// 鼠标移动
canvas.onmousemove = (e) => {
    const xx = e.clientX - rect.left, yy = e.clientY - rect.top;
    if (isDragging) {
        if (mode === 0) {
            if (!cur) {
                // 创建
                if (shapeType === 0) {
                    curPolygon = cur = new Polygon(sides, null, loc.x, loc.y, 0, 0);
                } else if (shapeType === 1) {
                    curPolygon = cur = new Bezier(loc.x, loc.y);
                }
                shapes.push(curPolygon);
            }
            const x = Math.min(loc.x, xx), y = Math.min(loc.y, yy),
                width = Math.abs(loc.x - xx),
                height = Math.abs(loc.y - yy);
            // 修改坐标
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (shapeType === 0) {
                curPolygon.setRect(x, y, width, height);
            } else if (shapeType === 1) {
                const dx = width, dy = height;
                const x1 = x + dx /3, y1 = y+dy/3, x2 = x+dx*2/3, y2 =y+dy*2/3, x3 = x+dx, y3 = y+dy;
                curPolygon.setXY(x, y);
                curPolygon.set(x1, y1, x2, y2, x3, y3);
            }
            // 绘制和设置图形
            ctx.strokeRect(x, y, width, height);
            drawAll();
        } else if ((mode === 1 || mode === 2) && curPolygon && !dragDirection) {
            // 对于拖拽的图形动态修改坐标
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (curPolygon instanceof Polygon) {
                curPolygon.setRect(xx - cx, yy - cy, curPolygon.width, curPolygon.height);
            } else if (curPolygon instanceof Bezier) {
                // 拖拽控制点
                if (cIndex) {
                    curPolygon.setC("x" + cIndex, xx);
                    curPolygon.setC("y" + cIndex, yy);
                } else {
                    // 移动
                    const x = curPolygon.x, y = curPolygon.y;
                    curPolygon.setXY(xx - cx, yy - cy);
                    const dx = curPolygon.x - x, dy = curPolygon.y - y;
                    curPolygon.set(curPolygon.x1 + dx, curPolygon.y1 + dy, curPolygon.x2 + dx, curPolygon.y2 + dy, curPolygon.x3 + dx, curPolygon.y3 + dy);
                }
                ctx.strokeRect(curPolygon.x, curPolygon.y, curPolygon.width, curPolygon.height);
                }
               
            drawAll();
        } else if (mode === 2 && dragDirection) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let x, y, w, h;
            switch (dragDirection) {
                case "top":
                    x = curPolygon.x;
                    y = yy;
                    w = curPolygon.width;
                    h = curPolygon.y - yy + curPolygon.height;
                    break;
                case "down":
                    x = curPolygon.x;
                    y = curPolygon.y;
                    w = curPolygon.width;
                    h =  yy - curPolygon.y;
                    break;
                case "left":
                    x = xx;
                    y = curPolygon.y;
                    w = curPolygon.x - xx + curPolygon.width;
                    h = curPolygon.height;
                    break;
                case "right":
                    x = curPolygon.x;
                    y = curPolygon.y;
                    w = xx - curPolygon.x;
                    h = curPolygon.height;
                    break;
            }
            curPolygon.setRect(x, y, w, h);
            ctx.strokeRect(curPolygon.x, curPolygon.y, curPolygon.width, curPolygon.height);
            drawAll();
        }
    } else if (mode === 2 && curPolygon instanceof Polygon) {
        if (xx > curPolygon.x - 3 && xx < curPolygon.x + curPolygon.width +3 && yy > curPolygon.y -3 && yy < curPolygon.y + curPolygon.height + 3) {
            if (xx < curPolygon.x + 3) {
                // 左
                dragDirection = "left";
                canvas.style.cursor = "w-resize";
            } else if (xx > curPolygon.x + curPolygon.width - 3) {
                // 右
                dragDirection = "right";
                canvas.style.cursor = "e-resize";
            } else if (yy < curPolygon.y + 3) {
                // 上
                dragDirection = "top";
                canvas.style.cursor = "n-resize";
            } else if (yy > curPolygon.y + curPolygon.height - 3) {
                // 下
                dragDirection = "down";
                canvas.style.cursor = "s-resize";
            } else {
                dragDirection = null;
                canvas.style.cursor = "default";
            }
        } else {
            dragDirection = null;
            canvas.style.cursor = "default";
        }
    }
    setter(curPolygon);
}

// 鼠标抬起
canvas.onmouseup = (e) => {
    isDragging = false;
    if (mode === 0) {
        cur = null;
    } else if (mode === 1 || mode === 2) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (curPolygon !== null) {
            ctx.strokeRect(curPolygon.x, curPolygon.y, curPolygon.width, curPolygon.height);
        }
        drawAll();
    }
}

////
// 事件
document.getElementsByName("setter").forEach(ele => {
    ele.addEventListener("change", (e) => {
       const key = e.target.dataset.a;
       if (curPolygon) {
           curPolygon.set(key, e.target.value);
           ctx.clearRect(0, 0, canvas.width, canvas.height);
           ctx.strokeRect(curPolygon.x, curPolygon.y, curPolygon.width, curPolygon.height);
           drawAll();
       }
    });
})
