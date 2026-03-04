# 部署说明

## 宝塔面板部署步骤

### 1. 上传代码
1. 将整个 `typecho_web` 文件夹上传到服务器
2. 建议放在 `/www/wwwroot/` 目录下

### 2. 安装依赖
```bash
cd /www/wwwroot/typecho_web
pip3 install -r requirements.txt
```

### 3. 宝塔面板配置
1. 打开宝塔面板 -> 网站 -> Python项目
2. 点击"添加Python项目"
3. 填写项目信息：
   - 项目名称: typecho_web
   - 项目路径: /www/wwwroot/typecho_web
   - 启动文件: wsgi.py
   - 端口: 6666 (或其他可用端口)
   - Python版本: 3.7+
4. 点击"提交"创建项目

### 4. 启动项目
在宝塔面板中点击"启动"按钮

### 5. 配置域名 (可选)
1. 在宝塔面板中添加站点
2. 设置反向代理到 `http://127.0.0.1:6666`

## 手动部署步骤

### 1. 环境准备
```bash
# 确保Python 3.7+已安装
python3 --version

# 安装pip (如果未安装)
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python3 get-pip.py
```

### 2. 运行安装脚本
```bash
cd typecho_web
chmod +x install.sh
./install.sh
```

### 3. 启动应用
```bash
# 开发环境
python3 run.py

# 生产环境 (使用Gunicorn)
pip3 install gunicorn
gunicorn -w 4 -b 0.0.0.0:6666 wsgi:application
```

## Docker部署 (可选)

### 1. 创建Dockerfile
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 6666

CMD ["python", "run.py"]
```

### 2. 构建和运行
```bash
docker build -t typecho-web .
docker run -d -p 6666:6666 --name typecho-web typecho-web
```

## 配置说明

### 环境变量
- `HOST`: 监听地址 (默认: 0.0.0.0)
- `PORT`: 监听端口 (默认: 6666)
- `DEBUG`: 调试模式 (默认: False)

### 配置文件
- `typecho_config.json`: Typecho站点配置
- `alist_config.json`: Alist账户配置

## 注意事项

1. **文件权限**: 确保应用目录有读写权限
2. **端口占用**: 确保配置的端口未被占用
3. **防火墙**: 开放对应端口的防火墙规则
4. **SSL证书**: 生产环境建议配置HTTPS
5. **备份**: 定期备份配置文件和数据

## 故障排除

### 常见问题
1. **端口被占用**: 修改端口或结束占用进程
2. **权限不足**: 检查文件和目录权限
3. **依赖缺失**: 重新安装requirements.txt中的包
4. **Python版本**: 确保Python版本 >= 3.7

### 日志查看
- 开发环境: 控制台输出
- 生产环境: 查看宝塔面板日志
- Systemd服务: `journalctl -u typecho-web`

