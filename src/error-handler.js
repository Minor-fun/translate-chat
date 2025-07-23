/**
 * error-handler.js
 * 错误处理模块，用于识别和分类翻译过程中的各种错误
 */

// 移除 i18n 模块导入和全局实例
// 改为通过函数参数传递翻译函数

/**
 * 获取翻译错误类型
 * @param {Error} e 错误对象
 * @param {string} provider 翻译提供者名称
 * @param {Function} t 翻译函数，如果提供则用于国际化错误消息
 * @returns {string} 错误类型描述
 */
function getErrorType(e, provider = '', t = null) {
  // 如果没有提供翻译函数，使用默认函数返回原始文本
  const translate = t || (key => key);
  
  const msg = String(e);
  let statusCode = e.statusCode || e.status || (e.response && e.response.status);
  
  // 尝试从错误对象中提取更详细的结构化错误信息
  // 常见路径包括 e.response.data (Axios等), e.response.body (fetch等), e.details (gRPC/Gemini)
  // 新增：支持从error.responseBody中提取
  const errorData = e.responseBody || (e.response && (e.response.data || e.response.body)) ? (e.responseBody || e.response.data || e.response.body) : null;
  const grpcStatus = e.details && Array.isArray(e.details) && e.details.length > 0 && e.details[0].status ? e.details[0].status : null; // 尝试解析gRPC详情中的status
  
  // 如果statusCode未直接获取到，尝试从错误消息字符串中解析
  if (!statusCode) {
    const httpErrorMatch = msg.match(/HTTP错误 (\d{3}):/);
    if (httpErrorMatch && httpErrorMatch[1]) {
      statusCode = parseInt(httpErrorMatch[1], 10);
    }
  }

  // 1. 优先判断特定的网络/URL错误
  if (e instanceof TypeError) {
    if (msg.includes('invalid URL') || msg.includes('Invalid URL') || msg.includes('unsupported protocol')) {
      return translate('invalidUrlError');
    }
  }
  // 检查node-fetch可能抛出的FetchError类型错误（node-fetch的FetchError是TypeError的子类，但具体错误码可能不同）
  if (e.code === 'ENOTFOUND' || (e.cause && e.cause.code === 'ENOTFOUND')) {
    return translate('dnsResolutionError');
  }
  if (e.code === 'ECONNREFUSED' || (e.cause && e.cause.code === 'ECONNREFUSED')) {
    return translate('connectionRefusedError');
  }
  if (e.code === 'EHOSTUNREACH' || (e.cause && e.cause.code === 'EHOSTUNREACH')) {
    return translate('hostUnreachableError');
  }
  if (e.code === 'ESOCKETTIMEDOUT' || e.code === 'ETIMEDOUT' || (e.cause && (e.cause.code === 'ESOCKETTIMEDOUT' || e.cause.code === 'ETIMEDOUT'))) {
    return translate('networkTimeoutError');
  }
  // 捕获更一般的网络错误，例如"fetch failed"但没有特定的错误码
  if (msg.includes('fetch failed') || msg.includes('network error') || msg.includes('request to') && msg.includes('failed')) {
    return translate('networkConnectionError');
  }

  // HTTP状态码错误判断
  if (statusCode) {
    return getHttpErrorType(statusCode, msg, provider, translate);
  }
  
  // API特定错误类型 - 优先检查结构化错误信息
  if (provider === '腾讯混元' || msg.includes('腾讯')) {
    // 尝试解析腾讯混元的结构化错误码
    if (errorData && errorData.Response && errorData.Response.Error && errorData.Response.Error.Code) {
      const code = errorData.Response.Error.Code;
      if (code === 'InvalidParameterValue') return translate('hunyuanParamError');
      if (code === 'AuthFailure') return translate('hunyuanAuthError');
      if (code === 'ResourceUnavailable' || code === 'ServiceUnavailable') return translate('hunyuanServiceUnavailableError');
      if (code === 'RequestLimitExceeded') return translate('hunyuanRateLimitError');
      // 可以根据腾讯混元官方文档添加更多具体的错误码判断
    }
    // 回退到消息包含匹配
    if (msg.includes('choices') && msg.includes('length') && msg.includes('0')) {
      return translate('hunyuanNoResponseError');
    }
    if (msg.includes('AuthFailure') || msg.includes('InvalidParameter')) {
      return translate('hunyuanParamFormatError');
    }
    if (msg.includes('ResourceUnavailable') || msg.includes('ServiceUnavailable')) {
      return translate('hunyuanServiceUnavailableError');
    }
  }
  
  if (provider === 'OpenAI' || msg.includes('openai')) {
    // 尝试解析OpenAI的结构化错误码和类型
    const openaiError = errorData && errorData.error ? errorData.error : null;
    if (openaiError && openaiError.code) {
      if (openaiError.code === 'model_not_found') return translate('openaiModelNotFoundError');
      if (openaiError.code === 'insufficient_quota') return translate('openaiQuotaExceededError');
      if (openaiError.code === 'context_length_exceeded') return translate('openaiContextLengthError');
      // 根据OpenAI官方文档添加更多具体的错误码判断
    } else if (openaiError && openaiError.type) { // 有些错误可能只有type没有code
        if (openaiError.type === 'invalid_request_error' && msg.includes('content_filter')) return translate('openaiContentPolicyError');
    }
    // 回退到消息包含匹配
    if (msg.includes('model_not_found')) {
      return translate('openaiModelNotFoundError');
    }
    if (msg.includes('insufficient_quota')) {
      return translate('openaiQuotaExceededError');
    }
    if (msg.includes('context_length_exceeded')) {
      return translate('openaiContextLengthError');
    }
  }
  
  if (provider === 'Gemini' || msg.includes('gemini')) {
    // 尝试解析Gemini的gRPC状态码或结构化错误信息
    if (grpcStatus) {
        // gRPC状态码通常是大写字符串，如 "INVALID_ARGUMENT"
        if (grpcStatus === 'INVALID_ARGUMENT') return translate('geminiParamError');
        if (grpcStatus === 'UNAUTHENTICATED') return translate('geminiAuthError');
        if (grpcStatus === 'PERMISSION_DENIED') return translate('geminiPermissionError');
        if (grpcStatus === 'RESOURCE_EXHAUSTED') return translate('geminiQuotaError');
        if (grpcStatus === 'INTERNAL') return translate('geminiInternalError');
        if (grpcStatus === 'UNAVAILABLE') return translate('geminiUnavailableError');
        // 根据Gemini官方文档添加更多具体的gRPC状态码判断
    } else if (errorData && errorData.candidates && errorData.candidates.length === 0) {
        return translate('geminiNoResponseError');
    } else if (errorData && errorData.promptFeedback && errorData.promptFeedback.safetyRatings) {
        return translate('geminiSafetyFilterError');
    }
    // 回退到消息包含匹配
    if (msg.includes('candidates') && msg.includes('length') && msg.includes('0')) {
      return translate('geminiNoResponseError');
    }
    if (msg.includes('safety_ratings')) {
      return translate('geminiSafetyFilterError');
    }
    if (msg.includes('RESOURCE_EXHAUSTED')) {
      return translate('geminiResourceLimitError');
    }
  }
  
  if (provider === 'AIGateway' || msg.includes('gateway') || msg.includes('cloudflare')) {
    // 尝试解析AI Gateway的结构化错误码
    if (errorData && errorData.error && Array.isArray(errorData.error) && errorData.error.length > 0 && errorData.error[0].code) {
      const code = errorData.error[0].code;
      const errorMessage = errorData.error[0].message; // 获取具体的错误消息

      if (code === 2019 && errorMessage.includes('Chat completion bad format')) return translate('aiGatewayEmptyContentError');
      if (code === 'routing_error') return translate('aiGatewayRoutingError');
      if (code === 'provider_error') return translate('aiGatewayProviderError');
      if (code === 'rate_limited' || code === 'quota_exceeded') return translate('aiGatewayQuotaError');
      // 根据Cloudflare AI Gateway官方文档添加更多具体的错误码判断
    }
    // 回退到消息包含匹配
    if (msg.includes('routing_error')) {
      return translate('aiGatewayRoutingError');
    }
    if (msg.includes('provider_error')) {
      return translate('aiGatewayProviderError');
    }
    if (msg.includes('rate_limiting') || msg.includes('quota')) {
      return translate('aiGatewayQuotaError');
    }
  }
  
  // 通用错误类型 (作为所有API特定检查的最终回退)
  const errorTypes = [
    // 移除了之前的通用网络错误模式，因为现在有更具体的判断
    { pattern: 'Authentication failed|auth failed|API key not valid|invalid_request_error|invalid_key', type: 'invalidApiKeyError' },
    { pattern: 'RESOURCE_EXHAUSTED|rate_limit|quota exceeded|usage_limit', type: 'requestRateLimitError' },
    { pattern: 'SyntaxError.*JSON|Unexpected token|Invalid JSON', type: 'jsonParseError' },
    { pattern: 'request entity too large|content_too_long|payload too large', type: 'contentTooLargeError' },
    { pattern: 'Invalid AI translation|Invalid Gemini translation|empty_response', type: 'invalidResponseError' },
    { pattern: 'context_length_exceeded|tokens_exceeded|too_many_tokens', type: 'contextLengthExceededError' }, // 仍然保留通用判断
    { pattern: 'content_policy_violation|content_filter|moderation', type: 'contentPolicyViolationError' }
  ];
  
  // 匹配通用错误类型
  for (const { pattern, type } of errorTypes) {
    if (new RegExp(pattern, 'i').test(msg)) {
      return translate(type);
    }
  }
  
  return translate('unknownError');
}

/**
 * 获取HTTP错误类型
 * @param {number} statusCode HTTP状态码
 * @param {string} msg 错误消息
 * @param {string} provider 翻译提供者
 * @param {Function} t 翻译函数
 * @returns {string} HTTP错误类型描述
 */
function getHttpErrorType(statusCode, msg, provider, t = null) {
  // 如果没有提供翻译函数，使用默认函数返回原始文本
  const translate = t || (key => key);
  
  // 常见HTTP状态码错误映射
  const httpErrorMap = {
    400: 'badRequestError',
    401: 'unauthorizedError',
    403: 'forbiddenError',
    404: 'notFoundError',
    408: 'requestTimeoutError',
    413: 'contentTooLargeError',
    429: 'rateLimitError',
    500: 'serverError',
    502: 'gatewayError',
    503: 'serviceUnavailableError',
    504: 'gatewayTimeoutError'
  };

  // 提供商特定HTTP错误处理
  if (provider) {
    // 腾讯混元特定HTTP错误
    if (provider === '腾讯混元') {
      if (statusCode === 400 && msg.includes('InvalidParameterValue')) {
        return translate('hunyuanParamError');
      }
      if (statusCode === 401 && msg.includes('AuthFailure')) {
        return translate('hunyuanAuthError');
      }
      if (statusCode === 403 && msg.includes('Forbidden')) {
        return translate('hunyuanPermissionError');
      }
      if (statusCode === 429 && msg.includes('RequestLimitExceeded')) {
        return translate('hunyuanRateLimitError');
      }
      if (statusCode === 500 && msg.includes('InternalError')) {
        return translate('hunyuanInternalError');
      }
      if (statusCode === 503 && msg.includes('ServiceUnavailable')) {
        return translate('hunyuanServiceUnavailableError');
      }
    }
    
    // OpenAI特定HTTP错误
    if (provider === 'OpenAI') {
      if (statusCode === 400 && msg.includes('model_not_found')) {
        return translate('openaiModelNotFoundError');
      }
      if (statusCode === 400 && msg.includes('content_filter')) {
        return translate('openaiContentPolicyError');
      }
      if (statusCode === 401 && msg.includes('invalid_api_key')) {
        return translate('openaiInvalidKeyError');
      }
      if (statusCode === 429 && msg.includes('rate_limit_exceeded')) {
        return translate('openaiRateLimitError');
      }
      if (statusCode === 429 && msg.includes('insufficient_quota')) {
        return translate('openaiQuotaExceededError');
      }
      if (statusCode === 500 && msg.includes('server_error')) {
        return translate('openaiServerError');
      }
      if (statusCode === 503 && msg.includes('engine_overloaded')) {
        return translate('openaiOverloadedError');
      }
    }
    
    // Gemini特定HTTP错误
    if (provider === 'Gemini') {
      if (statusCode === 400 && msg.includes('INVALID_ARGUMENT')) {
        return translate('geminiParamError');
      }
      if (statusCode === 401 && msg.includes('UNAUTHENTICATED')) {
        return translate('geminiAuthError');
      }
      if (statusCode === 403 && msg.includes('PERMISSION_DENIED')) {
        return translate('geminiPermissionError');
      }
      if (statusCode === 429 && msg.includes('RESOURCE_EXHAUSTED')) {
        return translate('geminiQuotaError');
      }
      if (statusCode === 500 && msg.includes('INTERNAL')) {
        return translate('geminiInternalError');
      }
      if (statusCode === 503 && msg.includes('UNAVAILABLE')) {
        return translate('geminiUnavailableError');
      }
    }
    
    // Cloudflare AI Gateway特定HTTP错误
    if (provider === 'AIGateway' || provider === 'CloudflareAIGateway') {
      if (statusCode === 400 && msg.includes('invalid_route')) {
        return translate('aiGatewayRouteConfigError');
      }
      if (statusCode === 400 && msg.includes('invalid_request')) {
        return translate('aiGatewayRequestFormatError');
      }
      if (statusCode === 401 && msg.includes('unauthorized')) {
        return translate('aiGatewayAuthError');
      }
      if (statusCode === 403 && msg.includes('forbidden')) {
        return translate('aiGatewayPermissionError');
      }
      if (statusCode === 429 && msg.includes('rate_limited')) {
        return translate('aiGatewayRateLimitError');
      }
      if (statusCode === 429 && msg.includes('quota_exceeded')) {
        return translate('aiGatewayQuotaExceededError');
      }
      if (statusCode === 500 && msg.includes('internal_error')) {
        return translate('aiGatewayInternalError');
      }
      if (statusCode === 502 && msg.includes('provider_error')) {
        return translate('aiGatewayBackendError');
      }
      if (statusCode === 504 && msg.includes('gateway_timeout')) {
        return translate('aiGatewayTimeoutError');
      }
    }
  }

  // 返回通用HTTP错误类型或未知错误
  return httpErrorMap[statusCode] ? translate(httpErrorMap[statusCode]) : translate('httpError', statusCode);
}

/**
 * 处理翻译错误并返回错误类型和消息
 * @param {Error} error 错误对象
 * @param {string} provider 提供商名称
 * @param {Function} t 翻译函数
 * @returns {Object} 包含错误类型和消息的对象
 */
function handleTranslationError(error, provider = 'unknown', t = null) {
  const errorType = getErrorType(error, provider, t);
  const errorMessage = error.message || (t ? t('unknownError') : 'unknownError');
  
  // 返回错误类型和消息
  return {
    type: errorType,
    message: errorMessage
  };
}

// 导出错误处理函数
module.exports = {
  getErrorType,
  getHttpErrorType,
  handleTranslationError
}; 