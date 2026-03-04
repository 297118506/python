#!/bin/bash

# Typecho Web 管理平台安装脚本
# 适用于 Linux 系统和宝塔面板

set -e

echo "==================================="
echo "Typecho Web 管理平台安装脚本"
echo "==================================="

# 检查 Python 版本
check_python() {
    echo "检查 Python 环境..."
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | awk '{print $2}')
        echo "Python 版本: $PYTHON_VERSION"
        
        # 检查版本是否满足要求 (>= 3.7)
        MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
        MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
        
        if [[ $MAJOR -lt 3 ]] || [[ $MAJOR -eq 3 && $MINOR -lt 7 ]]; then
            echo "错误: 需要 Python 3.7 或更高版本"
            exit 1
        fi
    else
        echo "错误: 未找到 Python3"
        exit 1
    fi
}

# 安装依赖
install_dependencies() {
    echo "安装 Python 依赖包..."
    
    # 检查是否有 pip
    if ! command -v pip3 &> /dev/null; then
        echo "错误: 未找到 pip3"
        exit 1
    fi
    
    # 安装依赖
    pip3 install -r requirements.txt
    
    echo "依赖包安装完成"
}

# 创建必要文件
create_files() {
    echo "创建必要文件..."
    
    # 创建数据文件
    touch zylj.txt
    touch processed_links.md
    touch processed_links_double.md
    
    # 设置文件权限
    chmod 644 zylj.txt processed_links.md processed_links_double.md
    
    echo "文件创建完成"
}

# 创建启动脚本
create_start_script() {
    echo "创建启动脚本..."
    
    cat > start.sh << 'EOF'
#!/bin/bash

# Typecho Web 启动脚本

# 设置环境变量
export HOST=${HOST:-0.0.0.0}
export PORT=${PORT:-5000}
export DEBUG=${DEBUG:-False}

# 启动应用
python3 run.py
EOF
    
    chmod +x start.sh
    echo "启动脚本创建完成"
}

# 创建停止脚本
create_stop_script() {
    echo "创建停止脚本..."
    
    cat > stop.sh << 'EOF'
#!/bin/bash

# Typecho Web 停止脚本

# 查找并终止进程
PID=$(ps aux | grep "python3 run.py" | grep -v grep | awk '{print $2}')

if [ ! -z "$PID" ]; then
    echo "正在停止 Typecho Web (PID: $PID)..."
    kill $PID
    echo "Typecho Web 已停止"
else
    echo "Typecho Web 未运行"
fi
EOF
    
    chmod +x stop.sh
    echo "停止脚本创建完成"
}

# 创建systemd服务文件 (可选)
create_systemd_service() {
    if [[ $EUID -eq 0 ]]; then
        echo "创建 systemd 服务文件..."
        
        CURRENT_DIR=$(pwd)
        CURRENT_USER=$(logname 2>/dev/null || echo $SUDO_USER)
        
        cat > /etc/systemd/system/typecho-web.service << EOF
[Unit]
Description=Typecho Web Management Platform
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
Environment=PATH=/usr/bin:/usr/local/bin
Environment=HOST=0.0.0.0
Environment=PORT=5000
Environment=DEBUG=False
ExecStart=/usr/bin/python3 $CURRENT_DIR/run.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF
        
        systemctl daemon-reload
        echo "systemd 服务文件创建完成"
        echo "使用以下命令管理服务:"
        echo "  启动: sudo systemctl start typecho-web"
        echo "  停止: sudo systemctl stop typecho-web"
        echo "  开机自启: sudo systemctl enable typecho-web"
    fi
}

# 显示宝塔面板配置说明
show_bt_config() {
    echo ""
    echo "==================================="
    echo "宝塔面板配置说明"
    echo "==================================="
    echo "1. 在宝塔面板中创建 Python 项目"
    echo "2. 项目路径: $(pwd)"
    echo "3. 启动文件: wsgi.py"
    echo "4. 端口: 5000 (或自定义)"
    echo "5. Python 版本: 3.7+"
    echo "6. 依赖包: 已安装"
    echo ""
    echo "或者使用命令行启动:"
    echo "  开发环境: python3 run.py"
    echo "  生产环境: gunicorn -w 4 -b 0.0.0.0:5000 wsgi:application"
}

# 主函数
main() {
    check_python
    install_dependencies
    create_files
    create_start_script
    create_stop_script
    create_systemd_service
    show_bt_config
    
    echo ""
    echo "==================================="
    echo "安装完成！"
    echo "==================================="
    echo "项目目录: $(pwd)"
    echo "访问地址: http://localhost:5000"
    echo ""
    echo "启动应用:"
    echo "  ./start.sh"
    echo ""
    echo "停止应用:"
    echo "  ./stop.sh"
    echo ""
    echo "配置文件将在首次运行时自动创建"
}

# 运行主函数
main


