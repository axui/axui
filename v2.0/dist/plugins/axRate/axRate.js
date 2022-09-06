/*!
 *Last modified: 2022-09-06 16:51:16
 *名称: axRate.js
 *简介: 评星插件的js文件
 *用法: new axRate('#id',{参数})
 *版本: v1.0.0
 *演示: https://www.axui.cn/v2.0/ax-rate.php
 *客服: 3217728223@qq.com
 *交流: QQ群952502085
 *作者: AXUI团队
 */
class axRate {
    constructor(elem, options) {
        this.targetDom = axIdToDom(elem);
        this.options = axExtend({
            half: false, 
            icon: 'ax-iconfont ax-icon-star-f', 
            count: 5, 
            multiplier: 1, 
            value: 0, 
            readonly: false, 
            popShow: false, 
            popTheme: 'ad', 
            popFormat: '<i stars></i>星,总分:<i value></i>', 
            tipsShow: false, 
            tipsFormat: '<i stars></i>星,总分:<i value></i>', 
            clearShow: false, 
            size: '',
            rendered: '', 
            getValue: '', 
            setValue: '', 
        }, options, this.targetDom);
        this.handlers = {};
        this.value = 0;
        this.stars = 0;
        this.items = [];
        this.init();
    }
    init() {
        let _this = this;
        this.renderRate();
        this.set(this.options.value);
        let pop;
        if (this.options.popShow) {
            pop = axAddElem('div', { class: 'ax-rate-popcon' }, this.options.popFormat);
            this.tooltip = new axTooltip(this.items[0].dom, {
                trigger: 'none',
                theme: this.options.popTheme,
                content: pop,
            });
            new axHover(_this.ul, {
                enter: () => {
                    _this.tooltip.popup.show()
                },
                leave: () => {
                    _this.tooltip.popup.hide();
                },
                hold: _this.tooltip.popup.targetDom,
            });
        }
        if (!this.options.readonly) {
            this.clear.onclick = function () {
                _this.set(0);
            }
            this.items.forEach((item) => {
                let itemDom = item.dom,
                    firstChild = itemDom.firstElementChild,
                    before = this.items.filter(i => i.id < item.id),
                    after = this.items.filter(i => i.id > item.id);
                if (this.options.popShow) {
                    new axHover(itemDom, {
                        enter: () => {
                            _this.tooltip.popup.updatePosition(itemDom);
                        },
                    });
                }
                itemDom.onmousemove = function (e) {
                    let place = _this.movePlace(e, this);
                    before.forEach(i => {
                        i.dom.firstElementChild.classList.add('ax-full');
                        i.value = 1;
                    });
                    if (place == 'half') {
                        firstChild.classList.remove('ax-full');
                        firstChild.classList.add('ax-half');
                    } else if (place == 'full') {
                        firstChild.classList.remove('ax-half');
                        firstChild.classList.add('ax-full');
                    }
                    after.forEach(i => {
                        i.dom.firstElementChild.classList.remove('ax-half');
                        i.dom.firstElementChild.classList.remove('ax-full');
                    });
                    if (_this.options.popShow) {
                        _this.calculate(item, place, pop);
                    }
                    this.onclick = function () {
                        if (place == 'half') {
                            item.value = 0.5;
                        } else if (place == 'full') {
                            item.value = 1;
                        } else {
                            item.value = 0;
                        }
                        _this.calculate(item, place);
                        if (_this.options.tipsShow) {
                            _this.tipsValue ? _this.tipsValue.innerHTML = _this.value : null;
                            _this.tipsStars ? _this.tipsStars.innerHTML = _this.stars : null;
                        }
                        _this.options.getValue && _this.options.getValue.call(_this, _this.value, _this.stars);
                        'getValue' in _this.handlers ? _this.emit('getValue', _this.value, _this.stars) : null;
                    }
                }
            })
            this.ul.onmouseleave = function () {
                _this.set(_this.value);
                _this.options.setValue && _this.options.setValue.call(_this, _this.value, _this.stars);
                'setValue' in _this.handlers ? _this.emit('setValue', _this.value, _this.stars) : null;
            }
        }
    }
    set(val) {
        if (val <= 0) {
            val = 0;
        }
        if (val >= this.options.multiplier * this.options.count) {
            val = this.options.multiplier * this.options.count;
        }
        let stars = val / this.options.multiplier,
            beforeStars = Math.floor(stars),
            currentStar = stars - beforeStars;
        if (!this.options.half) {
            currentStar = 0;
        }
        if (!val) {
            this.items.forEach(i => {
                let dom = i.dom.firstElementChild;
                dom.classList.remove('ax-half');
                dom.classList.remove('ax-full');
                i.value = 0;
            });
        } else {
            for (let i = 0; i <= beforeStars - 1; i++) {
                let dom = this.items[i].dom.firstElementChild;
                dom.classList.remove('ax-half');
                dom.classList.add('ax-full');
                this.items[i].value = 1;
            }
        }
        this.stars = beforeStars;
        if (currentStar == 0.5) {
            let dom = this.items[beforeStars].dom.firstElementChild;
            dom.classList.remove('ax-full');
            dom.classList.add('ax-half');
            this.items[beforeStars].value = 0.5;
            this.stars += 0.5;
            beforeStars++;
        }
        for (let i = beforeStars; i < this.items.length; i++) {
            let dom = this.items[i].dom.firstElementChild;
            dom.classList.remove('ax-half');
            dom.classList.remove('ax-full');
            this.items[i].value = 0;
        }
        this.value = val;
        this.tipsValue ? this.tipsValue.innerHTML = val : null;
        this.tipsStars ? this.tipsStars.innerHTML = this.stars : null;
    }
    get(attr) {
        let obj = { stars: this.stars, value: this.value, count: this.options.count, multiplier: this.options.multiplier };
        return obj[attr];
    }
    calculate(item, place, pop) {
        let before = this.items.filter(i => i.id < item.id),
            stars = before.length;
        if (place == 'half') {
            stars += 0.5;
        } else if (place == 'full') {
            stars++;
        }
        if (pop) {
            pop.querySelector('[stars]').innerHTML = stars;
            pop.querySelector('[value]').innerHTML = this.options.multiplier * stars;
        } else {
            this.value = this.options.multiplier * stars;
            this.stars = stars;
        }
    }
    renderRate() {
        let _this = this;
        let fragment = document.createDocumentFragment(),
            star = `<i class="${this.options.icon}"></i>`,
            itemHTML = `<li class="ax-item">
                            ${star.repeat(2)}
                        </li>`;
        this.ul = axAddElem('ul');
        this.tips = axAddElem('div', { class: 'ax-tips' }, this.options.tipsFormat);
        this.tipsStars = this.tips.querySelector('[stars]');
        this.tipsValue = this.tips.querySelector('[value]');
        this.clear = axAddElem('i', { class: 'ax-iconfont ax-icon-close-o-f', clear: '' });
        this.options.clearShow ? fragment.appendChild(this.clear) : null;
        for (let i = 1; i <= this.options.count; i++) {
            let itemDom = axStrToDom(itemHTML),
                obj = {
                    id: i,
                    value: 0,
                    dom: itemDom,
                };
            this.items.push(obj);
            this.ul.appendChild(itemDom);
        }
        fragment.appendChild(this.ul);
        this.options.tipsShow ? fragment.appendChild(this.tips) : null;
        if (this.options.size) {
            this.targetDom.setAttribute('size', this.options.size);
        }
        this.targetDom.appendChild(fragment);
        this.options.rendered && this.options.rendered.call(this);
        'rendered' in this.handlers ? this.emit('rendered', '') : null;
    }
    movePlace(e, node) {
        if (!this.options.half) {
            return 'full';
        }
        let leftOffset = node.getBoundingClientRect().left,
            rightOffset = node.getBoundingClientRect().right,
            half = ((rightOffset - leftOffset) / 2),
            halfOffset = leftOffset + ~~half,
            placement = 'full';
        if (e.clientX < halfOffset) {
            placement = 'half';
        }
        return placement;
    }
    on(type, handler) {
        axAddPlan(type, handler, this);
        return this;
    }
    emit(type, ...params) {
        axExePlan(type, this, ...params);
    }
    off(type, handler) {
        axDelPlan(type, handler, this);
        return this;
    }
}
(() => {
    document.querySelectorAll('[axRate]').forEach(element => {
        new axRate(element);
    });
})();