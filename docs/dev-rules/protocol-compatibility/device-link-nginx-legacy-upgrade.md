# 自建中转 Nginx 发现与旧代理升级

> 通用规则见[跨端协议兼容](../protocol-compatibility.md)。

Nginx 部署核对 master 的实际根目录与网络命名空间，容器内的 Nginx 不作为宿主实例参与
接管，宿主 systemd 的挂载隔离仍受支持。升级没有部署事务记录的旧 Cindy 反向代理时，只迁移与旧模板结构完全
一致的回环 HTTP 路由和专用 502 fallback；自定义过的路由仍拒绝接管。证书、站点其余配置、
主人身份及设备登记不重建，迁移保留 prepare/rollback 的逆补丁。验证覆盖见
`packages/device-link-relay/src/__tests__/nginx.test.ts`；此修复不改变跨端线协议。

