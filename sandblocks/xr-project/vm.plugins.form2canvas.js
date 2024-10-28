"use strict";

// TODO: For now, this plugin must be loaded by adding it to the initialization of
// Object.extend(Squeak.Primitives.prototype

Object.extend(Squeak.Primitives.prototype, "Form2CanvasPlugin", {
  f2c_primitiveSetFormVisibility: function (argCount) {
    if (argCount !== 1) return false;

    this.f2c_showCanvas = this.stackBoolean(0);

    if (this.f2c_container != null) {
      this.f2c_container.style.display = this.f2c_showCanvas ? "block" : "none";
    }

    return this.popNIfOK(argCount);
  },

  f2c_ensureContainer: function (argCount) {
    this.f2c_showCanvas = true;
    if (this.f2c_container == null) {
      this.f2c_container = document.createElement("div");
      document.body.appendChild(this.f2c_container);
    }
    return this.f2c_container;
  },

  f2c_primitiveDrawFormOnTexture: function (argCount) {
    if (argCount !== 1) return false;

    const prims = this.vm.Squeak.Primitives.prototype;
    const receiver = this.stackNonInteger(1);
    const texture = this.js_objectOrGlobal(this.stackNonInteger(0));

    const canvas = texture.source.data;

    if (this.f2c_showCanvas) {
      const container = this.f2c_ensureContainer();
      if (!container.contains(canvas)) container.appendChild(canvas);
    }

    const context = canvas.getContext("2d");
    const form = prims.loadForm(receiver);
    const rect = {
      left: 0,
      top: 0,
      right: form.width,
      bottom: form.height,
    };
    prims.showForm(context, form, rect);

    return this.popNIfOK(argCount);
  },
});
