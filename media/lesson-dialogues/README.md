# 静电场双人对话样片

两段原创教学视频，分别用于电场与受力、电通量与高斯定理。画面使用 Manim Community 的三维坐标、球面、平面、空间矢量与相机；不是对参考视频的剪辑、翻录或逐帧仿制。

## 配音与人物

- 小夏：豆包 VV 2.0，预设合成音色 `zh_female_vv_uranus_bigtts`。
- 阿澈：豆包云舟 2.0，预设合成音色 `zh_male_m191_uranus_bigtts`。
- 两人均为虚构同学，网页主头像为本项目用 AI 生成的角色插画，不影射真人；同目录 SVG 为原创、可复现的替补插画。声音不是录制学生真人对话，也不是声音克隆。
- `*.timeline.json` 是实际生成 PCM 时长的逐句时间轴；字幕、画面切换和网页头像高亮共用同一时间轴。
- 每次请求留有独立脱敏记录，既有记录不被自动覆盖或重发。凭据只存在于本机进程环境，不属于源代码或课堂包。

## 图示条件

- 箭头方向为实际场方向；径向点源箭头随 1/r² 缩短。为可见性，场景使用归一化的空间单位。
- 电场 E 与力 F 的单位不同，蓝、金箭头分别使用固定的独立比例尺；它们在各自变化前后的长度比有物理意义，两种颜色的绝对长度不直接比较。
- 两倍电量的测试点大小轻微改变只是识别记号；不表示实际粒径或质量变化。测试电荷足够小，忽略它对源的影响。
- 长线与平面段落展示理想的无限均匀带电源；有限可见几何只是取景窗口，不计算有限物体的端部与边缘效应。课堂交互另行比较有限物体与理想模型。
- 沿场线移动的白色亮点是观察引导，不是电荷、电子、光子或电场物质流。静电场线不是粒子轨迹。
- 高斯通量为整个闭合面上 E·dA 的积分，场线穿入、穿出是方向和正负的图解，不是用有限根可见线条当作定量积分器。
- 净通量为零意味着包围净电荷为零，不意味着内部没有电荷，也不意味着面上电场为零。

## 参考与许可

物理参考：OpenStax University Physics Volume 2，§5.4、§6.1、§6.2；文本为本项目原创改述，未照录教材段落。

- https://openstax.org/books/university-physics-volume-2/pages/5-4-electric-field
- https://openstax.org/books/university-physics-volume-2/pages/6-1-electric-flux
- https://openstax.org/books/university-physics-volume-2/pages/6-2-explaining-gausss-law
- Manim Community：MIT 软件许可，https://github.com/ManimCommunity/manim 。使用软件不意味着视频获得 3Blue1Brown 背书。
- 豆包语音：按本机已授权账户生成，https://docs.volcengine.com/docs/DoubaoVoice/audio-generation-http?lang=zh 。发布和再分发仍遵守服务账户条款；本项目未把合成音色重新声明为第三方自由音色。

项目生成的原创动画、脚本与头像随本教材分发。未使用第三方音乐、真人肖像、3Blue1Brown 角色或其视频素材。

## 复现和验收

源脚本位于 `manim/`。语音 production/ 与中间 WAV、请求记录保留本地，网页构建只复制最终 MP4、封面、VTT、时间轴和头像。`*.manifest.json` 记录实际尺寸、时长、哈希和完整解码结果。没有人工听审时明确保留 `human_listening_review: false`，不把技术解码或自动字幕匹配冒充人工听审。
