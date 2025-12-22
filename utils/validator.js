/**
 * 通用验证和安全工具
 */

// URL验证 - 使用更宽松的正则，支持国际化域名和特殊字符
const URL_REGEX = /^https?:\/\/[^\s<>"]+$/i;

// XSS防护 - 转义HTML特殊字符
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 清理字符串 - 去除首尾空格和多余空白
function sanitizeString(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

// 验证正整数
function isPositiveInteger(value) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
}

// 验证非负整数
function isNonNegativeInteger(value) {
  const num = Number(value);
  return Number.isInteger(num) && num >= 0;
}

// 验证URL格式
function isValidUrl(url) {
  if (typeof url !== 'string') return false;
  return URL_REGEX.test(url);
}

// 验证菜单名称
function validateMenuName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: '菜单名称不能为空' };
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: '菜单名称不能为空' };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: '菜单名称不能超过50个字符' };
  }
  return { valid: true, value: trimmed };
}

// 验证卡片数据
function validateCard(data) {
  const errors = [];
  
  if (!data.menu_id || !isPositiveInteger(data.menu_id)) {
    errors.push('请选择有效的菜单');
  }
  
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('标题不能为空');
  } else if (data.title.trim().length > 100) {
    errors.push('标题不能超过100个字符');
  }
  
  if (!data.url || typeof data.url !== 'string' || !data.url.trim()) {
    errors.push('链接不能为空');
  } else if (!isValidUrl(data.url.trim())) {
    errors.push('请输入有效的URL（以http://或https://开头）');
  }
  
  if (data.desc && data.desc.length > 500) {
    errors.push('描述不能超过500个字符');
  }
  
  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') };
  }
  
  return {
    valid: true,
    data: {
      menu_id: Number(data.menu_id),
      sub_menu_id: data.sub_menu_id ? Number(data.sub_menu_id) : null,
      title: sanitizeString(data.title, 100),
      url: sanitizeString(data.url, 2000),
      logo_url: sanitizeString(data.logo_url || '', 2000),
      custom_logo_path: sanitizeString(data.custom_logo_path || '', 500),
      desc: sanitizeString(data.desc || '', 500),
      order: isNonNegativeInteger(data.order) ? Number(data.order) : 0
    }
  };
}

// 验证广告数据
function validateAd(data) {
  const errors = [];
  
  if (!data.position || !['left', 'right'].includes(data.position)) {
    errors.push('广告位置只能是left或right');
  }
  
  if (!data.img || typeof data.img !== 'string' || !data.img.trim()) {
    errors.push('图片地址不能为空');
  }
  
  if (!data.url || typeof data.url !== 'string' || !data.url.trim()) {
    errors.push('链接不能为空');
  } else if (!isValidUrl(data.url.trim())) {
    errors.push('请输入有效的URL');
  }
  
  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') };
  }
  
  return {
    valid: true,
    data: {
      position: data.position,
      img: sanitizeString(data.img, 2000),
      url: sanitizeString(data.url, 2000)
    }
  };
}

// 验证友链数据
function validateFriend(data) {
  const errors = [];
  
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('网站名称不能为空');
  } else if (data.title.trim().length > 100) {
    errors.push('网站名称不能超过100个字符');
  }
  
  if (!data.url || typeof data.url !== 'string' || !data.url.trim()) {
    errors.push('链接不能为空');
  } else if (!isValidUrl(data.url.trim())) {
    errors.push('请输入有效的URL');
  }
  
  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') };
  }
  
  return {
    valid: true,
    data: {
      title: sanitizeString(data.title, 100),
      url: sanitizeString(data.url, 2000),
      logo: sanitizeString(data.logo || '', 2000)
    }
  };
}

// 验证ID数组
function validateIdArray(ids, fieldName = 'ID') {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { valid: false, error: `请选择要操作的${fieldName}` };
  }
  
  const validIds = ids.filter(id => isPositiveInteger(id)).map(Number);
  
  if (validIds.length === 0) {
    return { valid: false, error: `无效的${fieldName}` };
  }
  
  return { valid: true, ids: validIds };
}

// 异步错误包装器
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  escapeHtml,
  sanitizeString,
  isPositiveInteger,
  isNonNegativeInteger,
  isValidUrl,
  validateMenuName,
  validateCard,
  validateAd,
  validateFriend,
  validateIdArray,
  asyncHandler
};
