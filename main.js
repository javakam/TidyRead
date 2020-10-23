// ==UserScript==
// @name        TidyRead
// @namespace   http://tampermonkey.net/
// @icon  		https://csdnimg.cn/public/favicon.ico
// @match       *://blog.csdn.net/*/article/details/*
// @match       *://*.blog.csdn.net/article/details/*
// @match       <$URL$>
// @include     https://bbs.csdn.net/topics/*
// @include     https://*.iteye.com/blog/*
// @include     https://*.iteye.com/news/*
// @include     https://ask.csdn.net/questions/*
// @grant       GM_getValue
// @version     1.0.0
// @author      javakam
// @description 基于 "CSDN 去广告沉浸阅读模式-美女版" 版本进行简化,去除背景图 2020/10/23
// ==/UserScript==

(function () {
    'use strict';
    (() => {
        const LOCAL_STORAGE_PREFIX = '$TidyRead_'
        const Toolkit = {
            delay(timeout) {
                return new Promise(resolve => setTimeout(resolve, timeout))
            },
            // 通过 LocalStorage / GM_getValue 赋值
            setValue(key, value) {
                localStorage.setItem(LOCAL_STORAGE_PREFIX + key, value)
                GM_setValue(LOCAL_STORAGE_PREFIX + key, value)
            },
            getValue(key, defaultValue = null) {
                return localStorage.getItem(LOCAL_STORAGE_PREFIX + key) || GM_getValue(LOCAL_STORAGE_PREFIX + key, defaultValue)
            },
            showDom(selector, isShow) {
                const domList = document.querySelectorAll(selector)
                if (!domList || !domList.length) return
                const method = isShow ? 'remove' : 'add'
                for (const d of domList) {
                    d.classList[method]('d-none')
                }
            }
        }
        const BackgroundImageRange = {
            idOrUrl: null, // 当前 image ID / 自定义 url, 用于标记当前显示的图片
            get currentUrl() {
                const result = { url: "", name: "", category: null }
                return result
            },
            STATE_SELECTED_CATEGORY: 'STATE_SELECTED_CATEGORY',
            range: {
                categorys: [],          // 类目集合
                imgs: [],               // 图片集合
                customUrl: '',          // 自定义链接
                defaultHideMenu: true,  // 默认是否隐藏设置按钮
                showSourceLink: true,   // 是否匹配原文链接
            },
            init() {
                const range = Toolkit.getValue('background_ranges')
                if (range) {
                    try {
                        const _range = JSON.parse(range)
                        if (!_range || typeof _range !== 'object') throw new Error('range data error')
                        Object.assign(this.range, _range)
                    } catch (err) {
                        console.error(err)
                    }
                }
            },
            getSourceLinkDisplay() {
                return this.range.showSourceLink ? 'inline-block' : 'none'
            }
        }
        window.$TidyRead = {
            NAME: '整洁的阅读模式',
            BackgroundImageRange,
            options: [],
            launch() {
                console.log('%c[${window.$TidyRead.NAME}] 感谢支持!', 'color: teal')
                window.addEventListener('DOMContentLoaded', window.$TidyRead.onLoad)
                return this
            },
            init() {
                BackgroundImageRange.init() // 从本地存储中获取配置
                console.log(BackgroundImageRange.range)
                window.$TidyRead
                    .initSettings() // 初始化按钮组
                    .appendSheets() // 添加样式
                    // .cleanCopy() // 解禁复制功能
                    .launch() // DOM 初始化
            },
            // 生成 sheets
            _getSheets() {
                const sheets = `
                    body {
                        --comments-avatar-size: 50px;
                        --source-link-wrapper-display: ${window.$TidyRead.BackgroundImageRange.getSourceLinkDisplay()};
                    }
                    body:not(.clean-mode) { background-image: 'https://cdn.jsdelivr.net/gh/lingyia/APIIMG/pure/491.jpg'} !important; background-color:#EAEAEA !important; background-attachment: fixed !important;background-size; cover; background-repeat: no-repeat; background-size: 100% !important; }
                    body>#page>#content, body>.container.container-box,main,body>.main.clearfix { opacity: 0.85; }
                    main {margin: 20px;}
                    #local { position: fixed; left: -99999px }
                    .recommend-item-box .content,.post_feed_box,.topic_r,.mod_topic_wrap,#bbs_title_bar,#bbs_detail_wrap,#left-box,main {width: 100% !important;}
                    .column-advert-box, .comment-sofa-flag, #article_content .more-toolbox, .blog-content-box a[data-report-query],main .template-box, .blog-content-box>.postTime,.post_body div[data-pid],#unlogin-tip-box,.t0.clearfix,.recommend-item-box.recommend-recommend-box,.hljs-button.signin,.csdn-side-toolbar>a[data-type]:not([data-type=gotop]):not([data-type="$setting"]),a[href^="https://edu.csdn.net/topic"],.adsbygoogle,.mediav_ad,.bbs_feed_ad_box,.bbs_title_h,.title_bar_fixed,#adContent,.crumbs,#page>#content>#nav,#local,#reportContent,.comment-list-container>.opt-box.text-center,.type_hot_word,.blog-expert-recommend-box,.login-mark,#passportbox,.hljs-button.signin,.recommend-download-box,.recommend-ad-box,#dmp_ad_58,.blog_star_enter,#header,.blog-sidebar,#new_post.login,.mod_fun_wrap,.hide_topic_box,.bbs_bread_wrap,.news-nav,#rightList.right-box,aside,#kp_box_476,.tool-box,.recommend-right,.pulllog-box,.adblock,.fourth_column,.hide-article-box,#csdn-toolbar
                        {display: none !important;}
                    .hide-main-content,#blog_content,#bbs_detail_wrap,.article_content {height: auto !important;}
                    .comment-list-box,#bbs_detail_wrap {max-height: none !important;}
                    #main {width: 100% !important;}
                    #page {width: 80vw !important;}
                    #bbs_title_bar {margin-top: 20px;}
                    #page>#content {margin-top: 0 !important;}
                    /* 评论区每行增加 hover 效果 */
                    .comment-box { background-color: rgba(255,255,255,0.9) !important; }
                    .comment-list-box { padding: 0 !important; }
                    .comment-list-box > .comment-list { padding: 0 24px; margin-top: 0 !important; padding-top: 16px }
                    .comment-list-box > .comment-list:hover { background-color: rgba(255,255,255,0.7); }
                    /* 屏蔽固定在页面底部的 toolbox  */
                    .more-toolbox > .left-toolbox { position: relative !important; left: 0 !important; }
                    /* 底部作者信息右侧按钮只显示关注  */
                    .right-message > a:not(.personal-watch) { display: none; }
                    /* 评论区输入框交叉轴对齐 */
                    .comment-edit-box { display: flex; align-items: center; }
                    /* 原文链接样式 */
                    .source-link-wrapper { display: var(--source-link-wrapper-display); vertical-align: top; }
                    .source-link-wrapper > .source-link-icon { margin-right: 5px; }
                    .source-link-wrapper > .source-link-label { }
                    .source-link-wrapper > .source-link-link {
                        display: inline-block;
                        overflow: hidden;
                        text-overflow:ellipsis;
                        white-space: nowrap;
                        width: 20vw;
                        max-width: 30vw;
                        min-width: 15vw;
                    }
                    .source-link-wrapper > .source-link-link:hover { color: #008eff !important; }
                    /* 防止网页主体内容被黑白处理, 适用于特殊日期; CSDN 真是太蠢了，只有 CSDN 把文章内容中的图片都显示成黑白的了, 严重影响阅读!  */
                    html { filter: grayscale(0) !important; }
                    /* 评论区评论内容强制换行以保持一致性 */
                    .comment-box .comment-list-container .comment-list .new-comment { display: block !important; }
                    /* 覆盖所有 media query 样式以防止原有的自适应样式导致布局错乱 */
                    @media screen and (max-width: 1379px) and (min-width: 1320px) {
                        .main_father > .container#mainBox > main { width: 100% !important; float: none; margin: 0 !important; margin-top: 20px !important; }
                    }
                    @media screen and (max-width: 1699px) and (min-width: 1550px) {
                        .main_father > .container#mainBox > main { width: 100% !important; float: none; margin: 0 !important; margin-top: 20px !important; }
                    }
                    @media screen and (max-width: 1549px) and (min-width: 1380px) {
                        .main_father > .container#mainBox > main { width: 100% !important; float: none; margin: 0 !important; margin-top: 20px !important; }
                    }
                    @media screen and (min-width: 1700px) {
                        .main_father > .container#mainBox > main { width: 100% !important; float: none; margin: 0 !important; margin-top: 20px !important; }
                    }
                    /* 评论区样式重写 */
                    .comment-list-container img.avatar {
                        width: var(--comments-avatar-size) !important;
                        height: var(--comments-avatar-size) !important;
                        margin-top: 4px;
                        margin-right: 15px !important;
                    }
                    .comment-edit-box img.show_loginbox {
                        width: var(--comments-avatar-size) !important;
                        height: var(--comments-avatar-size) !important;
                    }
                    /* 防止原有的自适应样式导致布局错乱 */
                    @media screen and (min-width: 1700px) {
                        .recommend-right.align-items-stretch { color: teal; display: none !important; }
                    }
                    /* 隐藏底部 more-toolbox 按钮组 ~~和底部作者 row 中的其他信息~~; 还是保留这一行吧 ... 以后可能会把更多对文章和作者的操作放到这里面  */
                    /* 修改底部 私信求帮助 按钮样式 */
                    .reward-user-box .reward-fexd { width: 100px !important; }
                    .reward-user-box .reward-word { display: none !important; }
                    .reward-user-box .reward-fexd { border: none !important; background: transparent !important; color: #B4B4B4 !important; font-size: 14px !important; line-height: 21px !important; height: 30px !important }
                    .reward-user-box .reward-fexd > div { color: transparent; }
                    .reward-user-box:hover .reward-fexd > div { color: #B4B4B4; }
                    /* iteye 样式重构 */
                    body>#page>#content, body>#page>#content>#main .blog_comment { width: auto; }
                    body>#page>#content>#main .blog_bottom { height: 30px; }
                    body>#page>#content>#main .blog_comment .comment_content { background-color: rgba(255, 214, 173, 0.2); }
                    body>#page>#content, body>#page>#content>#main { border: none; }
                    body>#page>#content>#main #bottoms, body>#page>#content>#main .blog_nav { display: none; }
                    body>#page>#content>#main .blog_title h3 { font-size: 24px; word-wrap: break-word; margin-bottom: 25px; }
                    body>#page>#content>#main, #bbs_title_bar > .owner_top,.blog-content-box { border-top-left-radius: 8px; border-top-right-radius: 8px; }
                    body > div#page {background-color: transparent}
                    .dl_no_more:after { content: "上边是原话, 脚本作者原本想屏蔽这段话, 但是 CSDN 从未找到自己的底线;\\A 从阅读更多必须注册, 到验证手机号必须关注公众号, 再到大尺度H广告, 严重影响了用户体验;\\A 自从 CSDN 使用明文密码被脱库之后我就不再使用 CSDN 账号, 为了继续阅读 CSDN 内容我写了这个脚本  "; color: teal; display: block; width: 60%; margin: auto; white-space: pre; }
                    .recommend-box>.recommend-item-box:hover { background-color: rgba(255,255,255,0.8); }
                    /* 脚本设置弹窗 */
                    a.option-box[data-type="$setting"] img {
                        -webkit-transform: rotate(360deg);
                        animation: rotation 2.5s linear 1;
                        -moz-animation: rotation 2.5s linear 1;
                        -webkit-animation: rotation 2.5s linear 1;
                        -o-animation: rotation 2.5s linear 1;
                    }
                    a.option-box[data-type=gotop] + a.option-box[data-type="$setting"] {
                        display: flex;
                    }
                    a.go-top-hide.option-box[data-type=gotop] + a.defaultHideMenu.option-box[data-type="$setting"] {
                        display: none;
                    }
                    #setting-dialog {
                        display: block;
                        position: fixed;
                        top: 20vh;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        justify-content: center;
                    }
                    #setting-dialog section header {
                        max-width: 550px;
                        height: 50px;
                        font-size: 20px;
                        background: none;
                        padding: 0 15px;
                        display: flex;
                        justify-content: space-between;
                        padding: 0 15px;
                        align-items: center;
                    }
                    #setting-dialog section header .icon-close > img {
                        width: 20px;
                        cursor: pointer;
                    }
                    #setting-dialog section article .row {
                        margin-bottom: 10px;
                    }
                    #setting-dialog section article .row > label {
                        font-weight: bold;
                    }
                    /* 链接输入框 */
                    #custom-bg-url {
                        width: 100%;
                        margin-right: 10px;
                        height: 25px;
                        border-radius: 3px;
                        border: 2px solid #DDD;
                    }
                    #setting-dialog section article .row#defaultHideMenu-wrap > .content > label {
                        cursor: pointer;
                        margin-right: 15px;
                    }
                    #setting-dialog section article .row#defaultHideMenu-wrap > .content > label >input {
                        vertical-align: middle;
                    }
                    #setting-dialog section article .row > .content {
                        display: flex;
                        width: 500px;
                        flex-wrap: wrap;
                        align-items: center;
                    }
                    #setting-dialog section article .row > .content > div {
                        color: grey;
                        margin-right: 10px;
                        cursor: pointer;
                    }
                    #setting-dialog section article .row > .content > div:hover {
                        color: #000;
                    }
                    #setting-dialog section article .row > .content > div.STATE_SELECTED_CATEGORY {
                        color: #F60;
                        font-size: 20px;
                        letter-spacing: 1px;
                    }
                    #setting-dialog section article {
                        max-width: 550px;
                        padding: 20px;
                        height: calc(100% - 50px);
                        overflow: auto;
                    }
                    #setting-dialog section article::-webkit-scrollbar {/*滚动条整体样式*/
                        width: 6px;     /*高宽分别对应横竖滚动条的尺寸*/
                        height: 6px;
                    }
                    #setting-dialog section article::-webkit-scrollbar-thumb {/*滚动条里面小方块*/
                        border-radius: 10%;
                        -webkit-box-shadow: inset 0 0 5px rgba(0,0,0,0.3);
                        background: rgba(0,0,0,0.3);
                    }
                    #setting-dialog section article::-webkit-scrollbar-track {/*滚动条里面轨道*/
                        -webkit-box-shadow: inset 0 0 5px rgba(0,0,0,0.3);
                        border-radius: 0;
                        background: rgba(0,0,0,0.1);
                    }
                    /* 弹窗内部样式 */
                    #setting-dialog section {
                        min-width: 500px;
                        height: 75vh;
                        max-height: 520px;
                        min-height: 370px;
                        /* overflow: auto; */
                        background-color: #FFF;
                        /* border-radius: 5px; */
                        border: 2px solid #EEE;
                    }
                    /* 自定义补充样式 */
                    .display-none {display: none !important;}
                    #setting-dialog .tips-line { color: grey; font-size: 12px }
                    #setting-dialog .link { color: blue; }
                    @-webkit-keyframes rotation{
                        from {-webkit-transform: rotate(0deg);}
                        to {-webkit-transform: rotate(360deg);}
                    }
                `
                return sheets
            },
            // 通过注入 css 实现隐藏广告并固定布局
            appendSheets() {
                const sheet = document.createTextNode(this._getSheets())
                const el = document.createElement('style')
                el.id = 'CSDM-cleaner-sheets'
                el.appendChild(sheet)
                document.getElementsByTagName('head')[0].appendChild(el)
                return this
            },
            // 复制功能
            cleanCopy() {
                csdn.copyright && csdn.copyright.init('', '', '')
                return this
            },
            onLoad() {
                // 图片下的底色
                document.body.setAttribute('style', 'background-color:#EAEAEA !important')
                // 解除跳转拦截
                $ && $("#content_views") && $("#content_views").off('click')
                // 初始化右侧 bottom menu tool bar
                window.$TidyRead.cleanCopy() // 解禁复制功能
                window.$TidyRead._launchPagintion() // 解禁并初始化分页组件
                window.$TidyRead.showSourceLink() // 转载的文章显示原文链接
            },
            _launchPagintion() {
                // 监听数据层变动并动态控制分页组件显示
                if (!csdn.comments) return
                Object.defineProperty(csdn.comments, 'pageCount', {
                    get() { return this._$pageCount || 1 },
                    set(v) {
                        console.log('set pageCount: ', v)
                        this._$pageCount = v // 先保存页数
                        Toolkit.showDom('#commentPage', v > 1) // 1. 控制分页组件显示
                        window.$TidyRead._initPagintion() // 2. 重构评论区样式
                    }
                })
            },
            _initPagintion() {
                // to bo continue ...
            },
            // 初始化 Options
            initSettings() {
                return this
            },
            _sourceLinkKeywords: ['转载自', '转自', '原文地址', '原文链接', '转载地址', '转载链接', '原文:', '原文：'],
            _getSourceLink (row) {
                for (const keyword of this._sourceLinkKeywords) {
                    if (row.indexOf(keyword) === -1) continue
                    // 1. 尝试从 <a> 标签中获取链接
                    const attrMatchRes = row.match(/href="(.*?)"/)
                    const attr = attrMatchRes && attrMatchRes[1]
                    if (attr) return attr
                    // 2. 尝试获取整段链接内容
                    const partMatchRes = row.replace(/<\/?[\w|\d]+>/g, '').match(/(https?:\/\/.*)\s?.*$/)
                    const part = partMatchRes && partMatchRes[1]
                    if (part) return part
                }
            },
            showSourceLink() {
                const sourceDom = document.querySelector('.article-source-link')
                let sourceLink = ''
                if (sourceDom) { // 从顶部折叠面板中获取
                    let hasSourceLink = false
                    for (const keyword of this._sourceLinkKeywords) {
                        if (sourceDom.innerHTML.indexOf(keyword) !== -1) {
                            hasSourceLink = true
                            break
                        }
                    }
                    if (hasSourceLink) {
                        const linkDom = sourceDom.querySelector('a')
                        if (linkDom) sourceLink = linkDom && linkDom.innerText
                    }
                } else {
                    // 从文中匹配, 从文末取 _sourceLinkCheckLineSize 行, 若包含 _sourceLinkKeywords 中的内容则使用正则匹配该行中包含的链接
                    if (!document.getElementById('article_content')) return false
                    const articleRaw = document.getElementById('article_content').innerHTML
                    const articleLastLines = articleRaw.split('\n')
                    // 倒序遍历, 优先取文末的原文链接
                    for (const row of articleLastLines) {
                        const link = this._getSourceLink(row)
                        if (link) {
                            sourceLink = link
                            break
                        }
                    }
                }
                if (!sourceLink) return
                this.appendSourceLinkDom(sourceLink)
                console.log(`%c[${window.$TidyRead.NAME}] 当前文章可能是转载的, 匹配到原文链接: ${sourceLink}`, 'color: teal')
            },
            appendSourceLinkDom(link) {
                const sourceLinkLabelWrapperDom = document.createElement('div')
                const sourceLinkIconDom = document.createElement('img')
                const sourceLinkLabelDom = document.createElement('span')
                const sourceLinkLinkDom = document.createElement('a')
                sourceLinkLabelWrapperDom.classList.add('source-link-wrapper')
                sourceLinkIconDom.classList.add('article-heard-img')
                sourceLinkIconDom.classList.add('source-link-icon')
                sourceLinkIconDom.setAttribute('src', 'https://csdnimg.cn/release/phoenix/template/new_img/shareWhite.png')
                sourceLinkLabelDom.classList.add('source-link-label')
                sourceLinkLabelDom.innerText = '转载自:'
                sourceLinkLinkDom.classList.add('follow-nickName')
                sourceLinkLinkDom.classList.add('source-link-link')
                sourceLinkLinkDom.innerText = link
                sourceLinkLinkDom.setAttribute('href', link)
                sourceLinkLinkDom.setAttribute('title', link)
                sourceLinkLinkDom.setAttribute('target', '_blank')

                sourceLinkLabelWrapperDom.appendChild(sourceLinkIconDom)
                sourceLinkLabelWrapperDom.appendChild(sourceLinkLabelDom)
                sourceLinkLabelWrapperDom.appendChild(sourceLinkLinkDom)
                // 插入页面中
                const wrapper = document.querySelector('.bar-content')
                console.log(wrapper)
                if (wrapper) wrapper.appendChild(sourceLinkLabelWrapperDom)
            }
        }
        window.$TidyRead.init()
    })()
})();