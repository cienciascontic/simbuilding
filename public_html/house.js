var SIM = SIM || {REVISION: '1'};

var id = 0;

SIM.HousePart = function() {
    this.points = [new THREE.Vector3(), new THREE.Vector3()];
    this.root = new THREE.Object3D();    
    this.rootTG = new THREE.Object3D();
    this.editPointsRoot = new THREE.Object3D();
    this.meshRoot = new THREE.Object3D();
    this.childrenRoot = new THREE.Object3D();
    this.root.add(this.editPointsRoot);
    this.root.add(this.rootTG);
    this.rootTG.add(this.meshRoot);
    this.rootTG.add(this.childrenRoot);
    this.id = id++;
    this.initMode = true;
    this.root.userData.housePart = this.rootTG.userData.housePart = this.childrenRoot.userData.housePart = this;
    this.setCurrentEditPointIndex(0);
};

SIM.HousePart.prototype.complete = function() {
    this.currentEditPointIndex = null;
    this.initMode = false;
    this.completed = true;
};

SIM.HousePart.prototype.isCompleted = function() {
    return this.completed;
};

SIM.HousePart.prototype.setCurrentEditPointIndex = function(i) {
    this.currentEditPointIndex = i;
    this.completed = false;
};

SIM.HousePart.prototype.getCurrentEditPointIndex = function() {
    return this.currentEditPointIndex;
};

SIM.HousePart.prototype.isCurrentEditPointVertical = function() {
    return false;
};

SIM.HousePart.prototype.setParentIfAllowed = function(parent) {
    if (parent && this.initMode && this.currentEditPointIndex === 0) {
        parent.childrenRoot.add(this.root);
    }
};

SIM.HousePart.prototype.drawEditPoints = function() {
    this.editPointsRoot.matrix.getInverse(this.root.matrixWorld);
    this.editPointsRoot.matrixAutoUpdate = false;
    this.editPointsRoot.updateMatrixWorld();
    for (var i = 0; i < this.points.length; i++) {
        if (i === this.editPointsRoot.children.length) {
            var sphere = new THREE.Mesh(new THREE.SphereGeometry(0.1));
            sphere.userData.housePart = this;
            sphere.userData.editPointIndex = i;
            this.editPointsRoot.add(sphere);
        }
        this.editPointsRoot.children[i].position = this.root.localToWorld(this.points[i].clone());
    }
};

SIM.Platform = function() {
    SIM.HousePart.call(this);
};

SIM.Platform.prototype = new SIM.HousePart();

SIM.Platform.prototype.moveCurrentEditPoint = function(p) {
    this.points[this.currentEditPointIndex] = p;
    if (this.initMode) {
        if (this.currentEditPointIndex === 0)
            this.points[1] = this.points[0];
    }
    var sourceIndex = this.currentEditPointIndex < 2 ? 0 : 2;
    var destinationIndex = sourceIndex === 0 ? 2 : 0;
    this.points[destinationIndex] = this.points[sourceIndex].clone();
    this.points[destinationIndex].z = this.points[sourceIndex + 1].z;
    this.points[destinationIndex + 1] = this.points[sourceIndex + 1].clone();
    this.points[destinationIndex + 1].z = this.points[sourceIndex].z;
    this.draw();
    this.childrenRoot.children.forEach(function(child) {
        child.userData.housePart.draw();
    });
};

SIM.Platform.prototype.draw = function() {
    for (var i = this.meshRoot.children.length; i >= 0; i--)
        this.meshRoot.remove(this.meshRoot.children[i]);

    this.drawEditPoints();

    if (SIM.Platform.texture === undefined) {
        SIM.Platform.texture = THREE.ImageUtils.loadTexture("resources/textures/platform.jpg");
        SIM.Platform.texture.wrapS = THREE.RepeatWrapping;
        SIM.Platform.texture.wrapT = THREE.RepeatWrapping;
        SIM.Platform.texture.repeat.x = 0.5;
    }

    var material = new THREE.MeshLambertMaterial();
    material.map = SIM.Platform.texture;

    var mesh = new THREE.Mesh(new THREE.CubeGeometry(1, 1, 0.2), material);
    mesh.userData.housePart = this;
    mesh.rotation.x = -Math.PI / 2;
    this.meshRoot.add(mesh);

    this.rootTG.scale.x = Math.abs(this.points[1].x - this.points[0].x);
    this.rootTG.scale.z = Math.abs(this.points[1].z - this.points[0].z);
    this.rootTG.position.x = this.points[0].x + (this.points[1].x - this.points[0].x) / 2;
    this.rootTG.position.z = this.points[0].z + (this.points[1].z - this.points[0].z) / 2;
};

SIM.Platform.prototype.canBeInsertedOn = function(parent) {
    return parent === null;
};

SIM.Wall = function() {
    SIM.HousePart.call(this);
    this.top = 10;
};

SIM.Wall.prototype = new SIM.HousePart();

SIM.Wall.prototype.moveCurrentEditPoint = function(p) {
    p = this.root.worldToLocal(p);
    this.points[this.currentEditPointIndex] = p;

    if (this.initMode) {
        if (this.currentEditPointIndex === 0) {
            this.points[1] = this.points[0].clone();
            this.points[2] = this.points[0].clone().setY(3);
            this.points[3] = this.points[0].clone().setY(3);
        }
    }

    if (this.currentEditPointIndex < 2)
        this.points[this.currentEditPointIndex + 2].setX(p.x).setZ(p.z);
    else
        this.points[this.currentEditPointIndex === 2 ? 3 : 2].y = p.y;

    this.draw();
};

SIM.Wall.prototype.draw = function() {
    for (var i = this.meshRoot.children.length; i >= 0; i--)
        this.meshRoot.remove(this.meshRoot.children[i]);

    this.drawEditPoints();

    if (SIM.Wall.texture === undefined) {
        SIM.Wall.texture = THREE.ImageUtils.loadTexture("resources/textures/wall.png");
        SIM.Wall.texture.wrapS = THREE.RepeatWrapping;
        SIM.Wall.texture.wrapT = THREE.RepeatWrapping;
    }
    SIM.Wall.texture.repeat.x = 0.1 * this.root.matrixWorld.elements[0];
    SIM.Wall.texture.repeat.y = 0.5;

    var material = new THREE.MeshLambertMaterial();
    material.map = SIM.Wall.texture;
    material.side = THREE.DoubleSide;

    var w = this.points[0].distanceTo(this.points[1]);
    var h = this.points[0].distanceTo(this.points[2]);
    var shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(w, 0);
    shape.lineTo(w, h);
    shape.lineTo(0, h);

    var collisionMesh = new THREE.Mesh(new THREE.ShapeGeometry(shape));
    collisionMesh.userData.housePart = this;
    collisionMesh.visible = false;
    this.meshRoot.add(collisionMesh);

    this.childrenRoot.children.forEach(function(child) {
        var part = child.userData.housePart;
        var windowHole = new THREE.Path();
//        windowHole.moveTo(part.points[0].x, part.points[0].y);
//        windowHole.lineTo(part.points[3].x, part.points[3].y);
//        windowHole.lineTo(part.points[1].x, part.points[1].y);
//        windowHole.lineTo(part.points[2].x, part.points[2].y);        
        var C = 100;
        windowHole.moveTo(Math.round(part.points[0].x * C) / C, Math.round(part.points[0].y * C) / C);
        windowHole.lineTo(Math.round(part.points[3].x * C) / C, Math.round(part.points[3].y * C) / C);
        windowHole.lineTo(Math.round(part.points[1].x * C) / C, Math.round(part.points[1].y * C) / C);
        windowHole.lineTo(Math.round(part.points[2].x * C) / C, Math.round(part.points[2].y * C) / C);
        shape.holes.push(windowHole);
    });

    var mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
    this.meshRoot.add(mesh);

    var v01 = new THREE.Vector3().subVectors(this.points[1], this.points[0]).normalize();
    this.rootTG.rotation.y = (v01.dot(new THREE.Vector3(0, 0, 1)) > 0 ? -1 : 1) * v01.angleTo(new THREE.Vector3(1, 0, 0));
    this.rootTG.position.x = this.points[0].x;
    this.rootTG.position.y = this.points[0].y;
    this.rootTG.position.z = this.points[0].z;
};

SIM.Wall.prototype.canBeInsertedOn = function(parent) {
    return parent instanceof SIM.Platform;
};

SIM.Wall.prototype.isCurrentEditPointVertical = function() {
    return this.currentEditPointIndex >= 2;
};

SIM.Window = function() {
    SIM.HousePart.call(this);
};

SIM.Window.prototype = new SIM.HousePart();

SIM.Window.prototype.moveCurrentEditPoint = function(p) {
    p = this.root.worldToLocal(p);
    this.points[this.currentEditPointIndex] = p;
    if (this.initMode) {
        if (this.currentEditPointIndex === 0)
            this.points[1] = this.points[0];
    }
    var sourceIndex = this.currentEditPointIndex < 2 ? 0 : 2;
    var destinationIndex = sourceIndex === 0 ? 2 : 0;
    this.points[destinationIndex] = this.points[sourceIndex].clone();
    this.points[destinationIndex].y = this.points[sourceIndex + 1].y;
    this.points[destinationIndex + 1] = this.points[sourceIndex + 1].clone();
    this.points[destinationIndex + 1].y = this.points[sourceIndex].y;
    this.draw();
    this.root.parent.userData.housePart.draw();
};

SIM.Window.prototype.draw = function() {
    for (var i = this.meshRoot.children.length; i >= 0; i--)
        this.meshRoot.remove(this.meshRoot.children[i]);

    this.drawEditPoints();
};

SIM.Window.prototype.canBeInsertedOn = function(parent) {
    return parent instanceof SIM.Wall;
};
