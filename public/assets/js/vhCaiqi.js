document.addEventListener('DOMContentLoaded', () => {
  const confettiEffect = (() => {
    // 状态对象
    const state = {
      canvas: null,
      ctx: null,
      W: 0,
      H: 0,
      isStart: false,
      mp: 150,
      particles: [],
      angle: 0,
      tiltAngle: 0,
      confettiActive: true,
      animationComplete: true,
      animationHandler: null,
      particleColors: {
        colorOptions: [
          "DodgerBlue", "OliveDrab", "Gold", "pink",
          "SlateBlue", "lightblue", "Violet", "PaleGreen",
          "SteelBlue", "SandyBrown", "Chocolate", "Crimson"
        ],
        colorIndex: 0,
        colorIncrementer: 0,
        getColor: function () {
          if (++this.colorIncrementer % 10 === 0) {
            this.colorIndex = (this.colorIndex + 1) % this.colorOptions.length;
          }
          return this.colorOptions[this.colorIndex];
        }
      }
    };

    // 粒子构造函数
    function createParticle(color, W, H, mp) {
      return {
        x: Math.random() * W,
        y: Math.random() * H - H,
        r: random(10, 30),
        d: Math.random() * mp + 10,
        color: color,
        tilt: Math.floor(10 * Math.random()) - 10,
        tiltAngleIncremental: 0.07 * Math.random() + 0.05,
        tiltAngle: 0
      };
    }

    // 工具函数
    function random(min, max) {
      return Math.floor(Math.random() * (max - min + 1) + min);
    }

    // 核心方法
    function setGlobals(dom) {
      state.canvas = document.querySelector(dom);
      state.ctx = state.canvas.getContext("2d");
    }

    function handleResize() {
      [state.W, state.H] = [state.canvas.width, state.canvas.height];
    }

    function initializeButton() {
      const elements = document.querySelectorAll('.vh-aside-item.user');
      elements.forEach(el => {
        el.addEventListener('mouseenter', restartConfetti);
        el.addEventListener('mouseleave', deactivateConfetti);
      });
    }

    function initializeConfetti() {
      state.particles = Array.from({ length: state.mp }, () =>
        createParticle(
          state.particleColors.getColor(),
          state.W,
          state.H,
          state.mp
        )
      );
      state.animationComplete = false;
      startConfetti();
    }

    // 动画相关方法
    function animate() {
      if (state.animationComplete) return;
      handleResize();
      state.ctx.clearRect(0, 0, state.W, state.H);
      state.particles.forEach(p => drawParticle(p, state.ctx));
      updateParticles();
      state.animationHandler = requestAnimationFrame(animate);
    }

    function drawParticle(p, ctx) {
      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
      ctx.stroke();
    }

    function updateParticles() {
      state.angle += 0.01;
      state.tiltAngle += 0.1;

      const activeParticles = state.particles.reduce((count, p, i) => {
        if (state.animationComplete) return count;
        if (!state.confettiActive && p.y < -15) p.y = state.H + 100;
        else {
          stepParticle(p, i);
          if (p.y <= state.H) count++;
          checkReposition(p, i);
        }
        return count;
      }, 0);

      if (activeParticles === 0) stopConfetti();
    }

    function stepParticle(p, i) {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(state.angle + p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(state.angle);
      p.tilt = 15 * Math.sin(p.tiltAngle - i / 3);
    }

    function checkReposition(p, i) {
      if (!(p.x > state.W + 20 || p.x < -20 || p.y > state.H)) return;

      const shouldReposition = (i % 5 > 0 || i % 2 === 0)
        ? { x: Math.random() * state.W, y: -10 }
        : Math.sin(state.angle) > 0
          ? { x: -5, y: Math.random() * state.H }
          : { x: state.W + 5, y: Math.random() * state.H };

      repositionParticle(p, shouldReposition.x, shouldReposition.y);
    }

    function repositionParticle(p, x, y) {
      Object.assign(p, { x, y, tilt: Math.floor(10 * Math.random()) - 10 });
    }

    // 控制方法
    function startConfetti() {
      [state.W, state.H] = [window.innerWidth, window.innerHeight];
      if (!state.animationComplete) animate();
    }

    function stopConfetti() {
      state.animationComplete = true;
      state.ctx?.clearRect(0, 0, state.W, state.H);
    }

    function clearTimers() {
      cancelAnimationFrame(state.animationHandler);
    }

    function deactivateConfetti() {
      state.confettiActive = false;
      clearTimers();
      stopConfetti();
      state.isStart = false;
    }

    function restartConfetti() {
      if (state.isStart) return;
      handleResize();
      state.isStart = true;
      clearTimers();
      setTimeout(() => {
        state.confettiActive = true;
        state.animationComplete = false;
        initializeConfetti();
      }, 100);
    }

    // 公共接口
    return {
      init: () => {
        if (!document.querySelector('.vh-aside-item.user > canvas')) return;
        setGlobals(".vh-aside-item.user > canvas");
        initializeButton();
        window.addEventListener('resize', handleResize);
      }
    };
  })();

  confettiEffect.init();
});