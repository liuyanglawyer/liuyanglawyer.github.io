/* ============================================================
   LB.config — 站点配置 & 云端（腾讯云开发 CloudBase）连接参数
   ============================================================ */
(function (window) {
  'use strict';
  var LS = window.LB.utils.LS;

  var CFG_KEY = 'lb_cfg_v1';

  var defaults = {
    /* ---- 站点信息 ---- */
    siteName: '刘洋律师的网络犯罪辩护站',
    siteSub: 'Cybercrime Defense',
    logoText: '律',
    /* ---- 律师资料 ---- */
    lawyerName: '刘洋',
    lawyerTitle: '股权高级合伙人 · 网络犯罪辩护与企业合规部主任',
    firm: '北京市盈科（海淀区）律师事务所',
    licenseNo: '',
    phone: '13488810991',
    email: 'Liuyang-hd@yingkelawyer.com',
    wechat: '',
    city: '北京',
    address: '',
    intro: '盈科全球数字经济法律服务中心北京中心主任，盈科海淀律师事务所管委会副主任、网络犯罪辩护与企业合规部主任，兼任北京市海淀区律师行业党委纪律检查部负责人。北京市海淀区大数据与人工智能律师人才库成员，中国人民大学诉讼制度与司法改革研究中心校外导师，中国政法大学刑事诊所课程校外老师，湖南大学法学院法硕实务课教师，北京市大学生模拟法庭大赛评委。2021年正式执业，执业前在公安系统工作多年，熟悉公安机关执法规则与程序；擅长通过电子数据审查为网络犯罪案件寻找辩护方向。',
    practice: [
      '网络犯罪辩护（帮信罪、侵公罪、电诈关联犯罪、掩隐罪、数据安全类犯罪）',
      '电子数据取证合法性审查与非法证据排除',
      '企业刑事合规、数据合规与出海合规',
      '网络侵权与人格权保护',
      '涉虚拟货币、涉人工智能与高科技行业案件',
      '职务侵占、非国家工作人员受贿等职务犯罪辩护',
      '刑事控告与被害人权益维护',
      '审前程序：会见、取保候审、羁押必要性审查'
    ],
    honors: [
      '盈科全球数字经济法律服务中心 北京中心主任',
      '盈科海淀律师事务所 管委会副主任',
      '盈科海淀律师事务所 党支部副书记',
      '盈科海淀律师事务所 网络犯罪辩护与企业合规部主任',
      '北京市律师协会 党建委副秘书长',
      '北京市海淀区律师行业党委纪律检查部负责人',
      '北京市海淀区大数据与人工智能律师人才库成员',
      '中国人民大学诉讼制度与司法改革研究中心 校外导师、"刑事诉讼法修订研究和论证"课题组成员',
      '中国政法大学 刑事诊所课程校外老师',
      '湖南大学法学院 法硕实务课教师',
      '广东财经大学法学院 人工智能法学研究中心研究员',
      '北京市大学生模拟法庭大赛评委',
      '陆军某部 法律顾问',
      '中央广播电视总台内参舆情中心 长期合作专家',
      '湖南文理学院 创业导师',
      '北京岳阳县商会 监事',
      '知名自媒体平台"网络法实务圈"联合创始人'
    ],
    education: [
      '中国政法大学 · 法律硕士学位',
      '北京大学新闻传播学院 · 传播学硕士学位'
    ],
    publications: [
      '撰写网络法专业文章逾 30 万字',
      '参编《网络法案》（法律出版社）',
      '参与撰写《"盈"的秘密3：认罪认罚从宽制度下的有效辩护》（法律出版社）',
      '著有《物权纠纷律师在线答疑》（中国法制出版社）',
      '撰写《生命玉树——全国公安特警抗震救灾纪实》（公安部治安管理局内部印刷）'
    ],
    caseHighlight: [
      '某省逾2亿元网络诈骗案（主办，侦查阶段介入，从第二顺位嫌疑人变更为第六被告人，刑期降档）',
      '某市公职人员侵犯公民个人信息案（主办，主犯，二审介入，减刑处理）',
      '某程序员危害计算机信息系统案（指控获利200余万元，主办，审查起诉阶段撤案，无罪，冻结资金全部退还）',
      '部督特大跨境电信网络诈骗案（主办，股东，侦查阶段介入，罪名降档、大幅减刑）',
      '某互联网公司供应链主管商业贿赂案（主办，侦查阶段介入，缓刑）',
      '某知名网络平台被保险诈骗（涉嫌网络恶势力）案（主办，主犯，逮捕后取保候审，去恶、从轻处罚）',
      '某知名电商平台被薅羊毛刷单诈骗案（主办，逮捕后取保候审）',
      '某市"涉农补贴"电信网络诈骗与掩饰隐瞒犯罪所得案（主办，主犯，侦查阶段介入，从轻处罚）',
      '某租赁公司涉嫌侵犯公民个人信息罪案（主办，公司涉案人员全员取保候审）',
      '某传播淫秽物品牟利罪案（主办，二审介入，获减刑）',
      '某金融科技服务公司涉信息类刑事的合规案（主办，提供合规方案，无罪处理）',
      '某儿童电子类玩具企业涉嫌网络贩枪案（主办，提供合规方案，无罪处理）',
      '某沿海企业家被跨省执法问询案（指导、准备证据、提供法律咨询，无罪处理）',
      '某省会市涉U币系列案（帮信罪、掩隐罪被刑拘，侦查阶段介入，公安机关撤案）',
      '某沿海城市集成电路芯片检测企业遭遇恶意不正当竞争案（主办，获赔100万元）',
      '某演员权益维护刑事控告案（主办，刑民交叉，刑事立案受理）'
    ],
    consultation: '刑事案件涉及人身自由，会见、阅卷与申请取保候审均有严格时限。如遇紧急情况，请优先通过电话联系，并简要说明涉嫌罪名、办案单位与羁押场所（工作日 9:00–18:00 优先响应）。',
    copyright: '本站案例与文章仅供专业法律研究与交流参考，不构成针对具体案件的法律意见。',
    icp: '',

    /* ---- 云端 (CloudBase) ---- */
    cloud: {
      enabled: false,
      envId: '',            // 云开发环境 ID，形如 xxx-1a2b3c4d
      region: '',           // 可选，一般留空由 SDK 自动解析
      collection: 'posts',  // 云数据库集合
      storagePath: 'blog/'  // 云存储目录前缀
    },

    /* ---- 本地管理员口令（云模式下不使用） ---- */
    localAdmin: {
      username: 'admin',
      password: 'lb2026'
    },

    heroHits: [
      { key: 'posts', label: '篇专业文章' },
      { key: 'tags', label: '个实务标签' },
      { key: 'words', label: '万字办案笔记' }
    ]
  };

  function deepMerge(base, over) {
    var out = {};
    Object.keys(base).forEach(function (k) {
      var b = base[k], o = over ? over[k] : undefined;
      if (b && typeof b === 'object' && !Array.isArray(b) && o && typeof o === 'object' && !Array.isArray(o)) {
        out[k] = deepMerge(b, o);
      } else if (o === undefined || o === null) {
        out[k] = b;
      } else {
        out[k] = o;
      }
    });
    if (over) Object.keys(over).forEach(function (k) { if (!(k in out)) out[k] = over[k]; });
    return out;
  }

  var saved = LS.get(CFG_KEY, null);
  var data = deepMerge(defaults, saved || {});

  var Config = {
    all: function () { return data; },
    get: function (k) { return data[k]; },
    set: function (k, v) { data[k] = v; this.save(); },
    patch: function (obj) { data = deepMerge(data, obj || {}); this.save(); return data; },
    save: function () { return LS.set(CFG_KEY, data); },
    reset: function () {
      data = JSON.parse(JSON.stringify(defaults));
      LS.del(CFG_KEY); LS.set(CFG_KEY, data);
      return data;
    },
    cloud: function () { return data.cloud; },
    defaults: defaults
  };

  window.LB.config = Config;
})(window);
