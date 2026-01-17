/**
 * endpoint-manager.js
 * 
 * API Endpoint Manager - Follows Linux philosophy, modularly manages translation API endpoints
 * 
 * Responsibilities:
 * - Manage user-defined API endpoints (name, URL, key, models)
 * - Provide independent endpoint configurations for receive and send directions
 * - Persist endpoint configurations
 */

'use strict';

/**
 * Endpoint data structure
 * @typedef {Object} Endpoint
 * @property {string} name - Endpoint name (user defined)
 * @property {string} url - API base URL (v1 format, excluding /chat/completions)
 * @property {string} key - API key
 * @property {string[]} models - List of available models
 * @property {Object} extraParams - Extra API parameters
 */

/**
 * Direction configuration
 * @typedef {Object} DirectionConfig
 * @property {string} endpoint - Endpoint name
 * @property {string} model - Model name
 */

class EndpointManager {
    /**
     * @param {Object} mod - TeraToolbox module instance
     */
    constructor(mod) {
        this.mod = mod;

        // Endpoint storage
        this.endpoints = new Map();

        // Direction configuration
        this.receiveConfig = { endpoint: 'google', model: '' };
        this.sendConfig = { endpoint: 'google', model: '' };
        this.fallbackConfig = { endpoint: 'google', model: '' };

        // Load from settings
        this._loadFromSettings();
    }

    /**
     * Load endpoint configuration from module settings
     * @private
     */
    _loadFromSettings() {
        const settings = this.mod.settings;

        // Load endpoints
        if (settings.endpoints && typeof settings.endpoints === 'object') {
            for (const [name, endpoint] of Object.entries(settings.endpoints)) {
                if (endpoint && endpoint.url) {
                    this.endpoints.set(name, {
                        name,
                        url: endpoint.url || '',
                        key: endpoint.key || '',
                        models: Array.isArray(endpoint.models) ? endpoint.models : [],
                        extraParams: endpoint.extraParams || {}
                    });
                }
            }
        }

        // Load direction configuration
        if (settings.receive) {
            this.receiveConfig = {
                endpoint: settings.receive.endpoint || 'google',
                model: settings.receive.model || ''
            };
        }

        if (settings.send) {
            this.sendConfig = {
                endpoint: settings.send.endpoint || 'google',
                model: settings.send.model || ''
            };
        }

        if (settings.fallback) {
            this.fallbackConfig = {
                endpoint: settings.fallback.endpoint || 'google',
                model: settings.fallback.model || ''
            };
        }
    }

    /**
     * Save endpoint configuration to module settings
     * @private
     */
    _saveToSettings() {
        // Convert Map to plain object
        const endpointsObj = {};
        for (const [name, endpoint] of this.endpoints) {
            endpointsObj[name] = {
                url: endpoint.url,
                key: endpoint.key,
                models: endpoint.models,
                extraParams: endpoint.extraParams
            };
        }

        this.mod.settings.endpoints = endpointsObj;
        this.mod.settings.receive = { ...this.receiveConfig };
        this.mod.settings.send = { ...this.sendConfig };
        this.mod.settings.fallback = { ...this.fallbackConfig };
        this.mod.saveSettings();
    }

    /**
     * Build endpoint config with validation and model selection
     * @private
     * @param {string} endpointName
     * @param {string} modelName
     * @param {Object} currentConfig
     * @returns {{success: boolean, message?: string, config?: Object}}
     */
    _buildConfig(endpointName, modelName, currentConfig = { endpoint: 'google', model: '' }) {
        if (!endpointName) {
            return { success: false, message: 'endpointNameRequired' };
        }

        const normalizedName = endpointName.trim().toLowerCase();

        // Validate endpoint exists (google is built-in)
        if (normalizedName !== 'google' && !this.endpoints.has(normalizedName)) {
            return { success: false, message: 'endpointNotFound' };
        }

        const normalizedModel = typeof modelName === 'string' ? modelName.trim() : '';
        let finalModel = '';
        if (normalizedName !== 'google') {
            const endpoint = this.endpoints.get(normalizedName);
            if (normalizedModel) {
                // User specified a model, validate it
                if (endpoint.models.length > 0 && !endpoint.models.includes(normalizedModel)) {
                    return { success: false, message: 'modelNotFound' };
                }
                finalModel = normalizedModel;
            } else if (normalizedName === currentConfig.endpoint && currentConfig.model) {
                // Same endpoint clicked without model specified, keep current model
                finalModel = currentConfig.model;
            } else if (endpoint.models.length > 0) {
                // Different endpoint or no current model, auto-select the first one
                finalModel = endpoint.models[0];
            }
        }

        return {
            success: true,
            config: {
                endpoint: normalizedName,
                model: finalModel
            }
        };
    }



    /**
     * Add new endpoint
     * @param {string} name - Endpoint name
     * @param {string} url - API URL
     * @param {string} key - API key
     * @returns {{success: boolean, message: string}}
     */
    addEndpoint(name, url, key) {
        // Validate parameters
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return { success: false, message: 'endpointNameRequired' };
        }

        if (!url || typeof url !== 'string' || url.trim() === '') {
            return { success: false, message: 'endpointUrlRequired' };
        }

        if (!key || typeof key !== 'string' || key.trim() === '') {
            return { success: false, message: 'endpointKeyRequired' };
        }

        // Normalize name
        const normalizedName = name.trim().toLowerCase();

        // Check if it is a reserved name
        if (normalizedName === 'google') {
            return { success: false, message: 'endpointNameReserved' };
        }

        // Check if already exists
        if (this.endpoints.has(normalizedName)) {
            return { success: false, message: 'endpointExists' };
        }

        // Validate URL format
        try {
            new URL(url.trim());
        } catch (e) {
            return { success: false, message: 'invalidEndpointUrl' };
        }

        // Create endpoint
        const endpoint = {
            name: normalizedName,
            url: url.trim().replace(/\/+$/, '').replace(/\/chat\/completions\/?$/, ''), // Remove trailing slash and specific path
            key: key.trim(),
            models: [],
            extraParams: {}
        };

        this.endpoints.set(normalizedName, endpoint);
        this._saveToSettings();

        return { success: true, message: 'endpointAdded', name: normalizedName };
    }

    /**
     * Delete endpoint
     * @param {string} name - Endpoint name
     * @returns {{success: boolean, message: string}}
     */
    removeEndpoint(name) {
        if (!name) {
            return { success: false, message: 'endpointNameRequired' };
        }

        const normalizedName = name.trim().toLowerCase();

        if (normalizedName === 'google') {
            return { success: false, message: 'endpointNameReserved' };
        }

        if (!this.endpoints.has(normalizedName)) {
            return { success: false, message: 'endpointNotFound' };
        }

        // Check if in use
        if (this.receiveConfig.endpoint === normalizedName) {
            this.receiveConfig = { endpoint: 'google', model: '' };
        }
        if (this.sendConfig.endpoint === normalizedName) {
            this.sendConfig = { endpoint: 'google', model: '' };
        }
        if (this.fallbackConfig.endpoint === normalizedName) {
            this.fallbackConfig = { endpoint: 'google', model: '' };
        }

        this.endpoints.delete(normalizedName);
        this._saveToSettings();

        return { success: true, message: 'endpointRemoved', name: normalizedName };
    }

    /**
     * Update endpoint information
     * @param {string} name - Endpoint name
     * @param {Object} updates - Updates {url?, key?, extraParams?}
     * @returns {{success: boolean, message: string}}
     */
    updateEndpoint(name, updates) {
        if (!name) {
            return { success: false, message: 'endpointNameRequired' };
        }

        const normalizedName = name.trim().toLowerCase();
        const endpoint = this.endpoints.get(normalizedName);

        if (!endpoint) {
            return { success: false, message: 'endpointNotFound' };
        }

        // Apply updates
        if (updates.url !== undefined) {
            try {
                new URL(updates.url.trim());
                endpoint.url = updates.url.trim().replace(/\/+$/, '').replace(/\/chat\/completions\/?$/, '');
            } catch (e) {
                return { success: false, message: 'invalidEndpointUrl' };
            }
        }

        if (updates.key !== undefined) {
            endpoint.key = updates.key.trim();
        }

        if (updates.extraParams !== undefined) {
            endpoint.extraParams = { ...endpoint.extraParams, ...updates.extraParams };
        }

        this._saveToSettings();

        return { success: true, message: 'endpointUpdated', name: normalizedName };
    }

    /**
     * Set model list for endpoint
     * @param {string} name - Endpoint name
     * @param {string[]} models - Model list
     * @returns {{success: boolean, message: string}}
     */
    setModels(name, models) {
        if (!name) {
            return { success: false, message: 'endpointNameRequired' };
        }

        const normalizedName = name.trim().toLowerCase();
        const endpoint = this.endpoints.get(normalizedName);

        if (!endpoint) {
            return { success: false, message: 'endpointNotFound' };
        }

        // Process model list
        let modelList = [];
        if (Array.isArray(models)) {
            modelList = models.map(m => m.trim()).filter(m => m !== '');
        } else if (typeof models === 'string') {
            modelList = models.split(',').map(m => m.trim()).filter(m => m !== '');
        }

        endpoint.models = modelList;
        this._saveToSettings();

        return {
            success: true,
            message: 'endpointModelsSet',
            name: normalizedName,
            models: modelList
        };
    }



    /**
     * Internal method to set direction config
     * @private
     * @param {string} direction - 'receive' or 'send'
     * @param {string} endpointName - Endpoint name
     * @param {string} modelName - Model name
     * @returns {{success: boolean, message: string}}
     */
    _setDirectionConfig(direction, endpointName, modelName = '') {
        const currentConfig = direction === 'receive' ? this.receiveConfig : this.sendConfig;
        const result = this._buildConfig(endpointName, modelName, currentConfig);
        if (!result.success) {
            return result;
        }

        const config = result.config;

        if (direction === 'receive') {
            this.receiveConfig = config;
        } else {
            this.sendConfig = config;
        }

        this._saveToSettings();

        const messageKey = direction === 'receive' ? 'receiveEndpointSet' : 'sendEndpointSet';
        return {
            success: true,
            message: messageKey,
            endpoint: config.endpoint,
            model: config.model
        };
    }

    /**
     * Internal method to set fallback config
     * @private
     * @param {string} endpointName - Endpoint name
     * @param {string} modelName - Model name
     * @returns {{success: boolean, message: string}}
     */
    _setFallbackConfig(endpointName, modelName = '') {
        const result = this._buildConfig(endpointName, modelName, this.fallbackConfig);
        if (!result.success) {
            return result;
        }

        const config = result.config;

        this.fallbackConfig = config;

        this._saveToSettings();

        return {
            success: true,
            message: 'fallbackEndpointSet',
            endpoint: config.endpoint,
            model: config.model
        };
    }

    /**
     * Set endpoint and model for receive direction
     * @param {string} endpointName - Endpoint name
     * @param {string} modelName - Model name
     * @returns {{success: boolean, message: string}}
     */
    setReceiveConfig(endpointName, modelName = '') {
        return this._setDirectionConfig('receive', endpointName, modelName);
    }

    /**
     * Set endpoint and model for send direction
     * @param {string} endpointName - Endpoint name
     * @param {string} modelName - Model name
     * @returns {{success: boolean, message: string}}
     */
    setSendConfig(endpointName, modelName = '') {
        return this._setDirectionConfig('send', endpointName, modelName);
    }

    /**
     * Set endpoint and model for fallback
     * @param {string} endpointName - Endpoint name
     * @param {string} modelName - Model name
     * @returns {{success: boolean, message: string}}
     */
    setFallbackConfig(endpointName, modelName = '') {
        return this._setFallbackConfig(endpointName, modelName);
    }



    /**
     * Get endpoint information
     * @param {string} name - Endpoint name
     * @returns {Endpoint|null}
     */
    getEndpoint(name) {
        if (!name) return null;
        const normalizedName = name.trim().toLowerCase();
        return this.endpoints.get(normalizedName) || null;
    }

    /**
     * Get list of all endpoints
     * @returns {Endpoint[]}
     */
    listEndpoints() {
        return Array.from(this.endpoints.values());
    }

    /**
     * Get receive direction configuration
     * @returns {DirectionConfig}
     */
    getReceiveConfig() {
        return { ...this.receiveConfig };
    }

    /**
     * Get send direction configuration
     * @returns {DirectionConfig}
     */
    getSendConfig() {
        return { ...this.sendConfig };
    }

    /**
     * Get fallback configuration
     * @returns {DirectionConfig}
     */
    getFallbackConfig() {
        return { ...this.fallbackConfig };
    }

    /**
     * Internal method to get endpoint info for a direction
     * @private
     * @param {string} direction - 'receive' or 'send'
     * @returns {{endpoint: Endpoint|null, model: string, isGoogle: boolean}}
     */
    _getEndpointInfo(direction) {
        const config = direction === 'receive' ? this.receiveConfig : this.sendConfig;
        return this._getEndpointInfoFromConfig(config);
    }

    /**
     * Internal method to get endpoint info from config
     * @private
     * @param {DirectionConfig} config
     * @returns {{endpoint: Endpoint|null, model: string, isGoogle: boolean}}
     */
    _getEndpointInfoFromConfig(config) {
        if (config.endpoint === 'google') {
            return { endpoint: null, model: '', isGoogle: true };
        }

        const endpoint = this.endpoints.get(config.endpoint);
        if (!endpoint) {
            // Endpoint not found, fallback to Google
            return { endpoint: null, model: '', isGoogle: true };
        }

        // If no model specified but endpoint has model list, use the first one
        let model = config.model;
        if (!model && endpoint.models.length > 0) {
            model = endpoint.models[0];
        }

        return { endpoint, model, isGoogle: false };
    }

    /**
     * Get complete endpoint info for receive direction (for translation)
     * @returns {{endpoint: Endpoint|null, model: string, isGoogle: boolean}}
     */
    getReceiveEndpointInfo() {
        return this._getEndpointInfo('receive');
    }

    /**
     * Get complete endpoint info for send direction (for translation)
     * @returns {{endpoint: Endpoint|null, model: string, isGoogle: boolean}}
     */
    getSendEndpointInfo() {
        return this._getEndpointInfo('send');
    }

    /**
     * Get complete endpoint info for fallback
     * @returns {{endpoint: Endpoint|null, model: string, isGoogle: boolean}}
     */
    getFallbackEndpointInfo() {
        return this._getEndpointInfoFromConfig(this.fallbackConfig);
    }

    /**
     * Internal method to get display name for a direction
     * @private
     * @param {string} direction - 'receive' or 'send'
     * @returns {string}
     */
    _getDisplayName(direction) {
        const config = direction === 'receive' ? this.receiveConfig : this.sendConfig;

        if (config.endpoint === 'google') {
            return 'Google';
        }

        const endpoint = this.endpoints.get(config.endpoint);
        if (!endpoint) {
            return 'Google';
        }

        const model = config.model || (endpoint.models[0] || '');
        return model ? `${endpoint.name}:${model}` : endpoint.name;
    }

    /**
     * Get display name for receive direction
     * @returns {string}
     */
    getReceiveDisplayName() {
        return this._getDisplayName('receive');
    }

    /**
     * Get display name for send direction
     * @returns {string}
     */
    getSendDisplayName() {
        return this._getDisplayName('send');
    }

    /**
     * Check if any endpoints are configured
     * @returns {boolean}
     */
    hasEndpoints() {
        return this.endpoints.size > 0;
    }

    /**
     * Get endpoint count
     * @returns {number}
     */
    getEndpointCount() {
        return this.endpoints.size;
    }

    /**
     * Mask API key (for display)
     * @param {string} key - API key
     * @returns {string}
     */
    maskKey(key) {
        if (!key || key.length < 24) return '****';
        return `${key.substring(0, 10)}...${key.substring(key.length - 10)}`;
    }
}

module.exports = EndpointManager;
