# -*- coding: utf-8 -*-

"""
配置文件
"""

import os

class Config:
    """基础配置"""
    # 应用基础配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'typecho_web_secret_key_2024'
    
    # 文件路径配置
    TYPECHO_CONFIG_FILE = 'typecho_config.json'
    ALIST_CONFIG_FILE = 'alist_config.json'
    ZYLJ_FILE = 'zylj.txt'
    PROCESSED_FILE = 'processed_links.md'
    PROCESSED_DOUBLE_FILE = 'processed_links_double.md'
    
    # 上传配置
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    # 默认配置
    DEFAULT_TYPECHO_CONFIG = {
        "api_url": "http://192.168.30.241:100/index.php/action/xmlrpc",
        "username": "admin",
        "password": "admin123"
    }

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    TESTING = False

class TestingConfig(Config):
    """测试环境配置"""
    DEBUG = True
    TESTING = True

# 配置字典
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


