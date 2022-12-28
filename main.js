'use strict';

let gl; // The webgl context.
let surface; // A surface model
let shProgram; // A shader program
let spaceball; // A SimpleRotator object that lets the user rotate the view by mouse.

let handlePosition = 0.0;

const R = 1;
const a = 1;
const n = 1;

const resolution = 1000;

const x = (r, B) => r * Math.cos(B);
const y = (r, B) => r * Math.sin(B);
const z = (r) => a * Math.cos((n * Math.PI * r) / R);

let scale = 1.0
let offset = 0.0

// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTexCoordBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices, texCoords) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        this.count = vertices.length / 3;
    }

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.vertexAttribPointer(shProgram.iNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
        gl.vertexAttribPointer(shProgram.iTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iTexCoord);

        gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.iNormal = -1;
    this.iNormalMatrix = -1;

    this.iAmbientColor = -1;
    this.iDiffuseColor = -1;
    this.iSpecularColor = -1;

    this.iShininess = -1;

    this.iLightPosition = -1;
    this.iLightVec = -1;

    this.iTexCoord = -1;
    this.iScaleLocation = -1;
    this.iOffsetLocation = -1;
    this.uModelViewProjectionMatrix = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    };
}


function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 2, aspect, 1, 2000);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0, 0, 1], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    const modelViewInverse = m4.inverse(matAccum1, new Float32Array(16));
    const normalMatrix = m4.transpose(modelViewInverse, new Float32Array(16));

    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    gl.uniform3fv(shProgram.iLightPosition, lightCoordinates());
    gl.uniform3fv(shProgram.iLightDirection, [1, 0, 0]);

    gl.uniform3fv(shProgram.iLightVec, new Float32Array(3));

    gl.uniform1f(shProgram.iShininess, 1.0);

    gl.uniform3fv(shProgram.iAmbientColor, [0.6, 0, 0.9]);
    gl.uniform3fv(shProgram.iDiffuseColor, [1.6, 1.0, 0.5]);
    gl.uniform3fv(shProgram.iSpecularColor, [1.0, 1.0, 2.0]);
    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);

    gl.uniform1f(shProgram.iScaleLocation, scale);
    gl.uniform1f(shProgram.iOffsetLocation, offset);
    gl.uniformMatrix4fv(shProgram.uModelViewProjectionMatrix, false, modelViewProjection);

    surface.Draw();
}

function CreateSurfaceData() {

    let vertexCircles = []
    let texCoordsCircles = []

    for (let r = 0; r <= 7; r += Math.PI / 8) {
        let vertexCircle = []
        let texCoordsCircle = []
        for (let B = 0; B <= 2 * Math.PI; B += Math.PI / 700) {
            vertexCircle.push([x(r, B), y(r, B), z(r)])

            const u = r / 7;
            const v = B / 2 * Math.PI;
            texCoordsCircle.push([u, v]);
        }
        vertexCircles.push(vertexCircle)
        texCoordsCircles.push(texCoordsCircle)
    }

    let vertexLines = vertexCircles[0].map((col, i) => vertexCircles.map(row => row[i]));
    let texCoordsLines = texCoordsCircles[0].map((col, i) => texCoordsCircles.map(row => row[i]));


    vertexLines = vertexLines.map(vertexLine => [...vertexLine, ...vertexLine.slice().reverse()])
    vertexCircles = vertexCircles.map(vertexCircle => [...vertexCircle, ...vertexCircle.slice().reverse()])

    texCoordsLines = texCoordsLines.map(texCoordsLine => [...texCoordsLine, ...texCoordsLine.slice().reverse()])
    texCoordsCircles = texCoordsCircles.map(texCoordsCircle => [...texCoordsCircle, ...texCoordsCircle.slice().reverse()])

    const vertex = [...vertexLines.flat(Infinity), ...vertexCircles.flat(Infinity)]
    const texCoords = [...texCoordsLines.flat(Infinity), ...texCoordsCircles.flat(Infinity)]

    return [
        vertex, texCoords
    ]
}

function createTexture() {

    let texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255]));

    let img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = 'https://upload.wikimedia.org/wikipedia/commons/4/41/Brickwall_texture.jpg';
    img.addEventListener('load', function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        draw();
    });
}

function keyDown(event) {
    if (event.keyCode == 65) { // A
        // Decrease the texture offset along the u parameter
        offset -= 0.1;
    } else if (event.keyCode == 68) { // D
        // Increase the texture offset along the u parameter
        offset += 0.1;
    } else if (event.keyCode == 87) { // W
        // Decrease the texture scaling factor
        scale -= 0.1;
    } else if (event.keyCode == 83) { // S
        // Increase the texture scaling factor
        scale += 0.1;
    }

    createTexture()
}

document.addEventListener('keydown', keyDown);


function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram("Basic", prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");

    shProgram.iNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "normalMatrix");

    shProgram.iAmbientColor = gl.getUniformLocation(prog, "ambientColor");
    shProgram.iDiffuseColor = gl.getUniformLocation(prog, "diffuseColor");
    shProgram.iSpecularColor = gl.getUniformLocation(prog, "specularColor");

    shProgram.iShininess = gl.getUniformLocation(prog, "shininess");

    shProgram.iLightPosition = gl.getUniformLocation(prog, "lightPosition");
    shProgram.iLightVec = gl.getUniformLocation(prog, "lightVec");

    shProgram.iTexCoord = gl.getAttribLocation(prog, "iTexCoord");
    shProgram.iScaleLocation = gl.getUniformLocation(prog, 'u_scale');
    shProgram.iOffsetLocation = gl.getUniformLocation(prog, 'u_offset');
    shProgram.uModelViewProjectionMatrix = gl.getUniformLocation(prog, "u_modelViewProjectionMatrix");

    surface = new Model("Surface");

    const surfaceData = CreateSurfaceData();
    surface.BufferData(surfaceData[0], surfaceData[1]);

    gl.enable(gl.DEPTH_TEST);
}


function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL(); // initialize the WebGL graphics context
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    // draw();
    createTexture();
}

window.addEventListener("keydown", function(event) {
    switch (event.key) {
        case "ArrowLeft":
            left();
            break;
        case "ArrowRight":
            right();
            break;
        default:
            return;
    }
});

const left = () => {
    handlePosition -= 0.07;
    reDraw();
};

const right = () => {
    handlePosition += 0.07;
    reDraw();
};

const lightCoordinates = () => {
    let coord = Math.sin(handlePosition) * 1.2;
    return [coord, -2, coord * coord];
};

const reDraw = () => {

    const surfaceData = CreateSurfaceData();
    surface.BufferData(surfaceData[0], surfaceData[1]);
    draw();
};