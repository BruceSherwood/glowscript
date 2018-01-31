;(function () {
    "use strict";
    
    // vector operator overloading is handled in file papercomp.js, extracted by Salvatore di Dio
    // from the PaperScript project of Jurg Lehni: http://scratchdisk.com/posts/operator-overloading.
    
    function adjust_up(parent, oldaxis, newaxis) { // adjust up when axis is changed
    	parent.__change()
    	if (newaxis.mag2 === 0) {
    		// If axis has changed to <0,0,0>, must save the old axis to restore later
    		if (parent.__oldaxis === undefined) parent.__oldaxis = oldaxis
    		return
    	}
		if (parent.__oldaxis !== undefined) {
			// Restore saved oldaxis now that newaxis is nonzero
			oldaxis = parent.__oldaxis
			parent.__oldaxis = undefined
    	}
		if (newaxis.dot(parent.__up) === 0) return // axis and up already orthogonal
    	var angle = oldaxis.diff_angle(newaxis)
    	if (angle > 1e-6) { // smaller angles lead to catastrophes
    		var rotaxis, newup
    		// If axis is flipped 180 degrees, cross(oldaxis,newaxis) is <0,0,0>:
    		if (Math.abs(angle-Math.PI) < 1e-6) newup = parent.__up.multiply(-1)
    		else {
	        	rotaxis = cross(oldaxis,newaxis)
	        	newup = parent.__up.rotate({angle:angle, axis:rotaxis})
    		}
        	// Be careful not to alter the attributeVectorUp character of parent.__up
        	parent.__up.__x = newup.x
        	parent.__up.__y = newup.y
        	parent.__up.__z = newup.z
	    }
    }
    
    function adjust_axis(parent, oldup, newup) { // adjust axis when up is changed
        parent.__change()
    	if (newup.mag2 === 0) {
    		// If up will be set to <0,0,0>, must save the old up to restore later
    		if (parent.__oldup === undefined) parent.__oldup = oldup
    	}
		if (parent.__oldup !== undefined) {
			// Restore saved oldup now that newup is nonzero
			oldup = parent.__oldup
			parent.__oldup = undefined
		}
		if (newup.dot(parent.__axis) === 0) return // axis and up already orthogonal
		var angle = oldup.diff_angle(newup)
    	if (angle > 1e-6) { // smaller angles lead to catastrophes
    		var rotaxis, newaxis
    		// If up is flipped 180 degrees, cross(oldup,newup) is <0,0,0>:
    		if (Math.abs(angle-Math.PI) < 1e-6) newaxis = parent.__axis.multiply(-1)
    		else {
	        	rotaxis = cross(oldup,newup)
	        	newaxis = parent.__axis.rotate({angle:angle, axis:rotaxis})
    		}
        	// Be careful not to alter the attributeVectorAxis character of parent.__axis
        	parent.__axis.__x = newaxis.x
        	parent.__axis.__y = newaxis.y
        	parent.__axis.__z = newaxis.z
    	}
    }

    function vec(x, y, z) {

        if (!(this instanceof vec)) {
            // vec(vec) makes a copy of the vec
            // Mentioning arguments in a function slows the function down.
            // In the case of Microsoft Edge (Dec. 2015), vec was 10 times slower if arguments mentioned!!
            if (y === undefined) 
                if (z === undefined) return new vec(x.x, x.y, x.z)
            return new vec(x, y, z)
        }
        
        if (z === undefined || y === undefined) throw new Error("vector() requires 3 arguments: x, y, and z.")
        this.x = x
        this.y = y
        this.z = z
    }  
    
    // These attributeVector objects must be set up in property.js

    function attributeVector(parent, x, y, z) {
        this.__parent = parent
        this.__x = x
        this.__y = y
        this.__z = z
        if (parent) {
        	parent.__change()
        }
    }
    attributeVector.prototype = new vec(0, 0, 0)
    attributeVector.prototype.constructor = attributeVector

    function attributeVectorPos(parent, x, y, z) { // for pos, to make make_trail work
    	this.__parent = parent
        this.__x = x
        this.__y = y
        this.__z = z
        if (parent) {
        	parent.__change()
        	parent._pos_set = true // needed by attach_trail updating
        	if (parent.__make_trail) parent.__update_trail(vec(x,y,z))
        }
    }
    attributeVectorPos.prototype = new vec(0, 0, 0)
    attributeVectorPos.prototype.constructor = attributeVectorPos

    function attributeVectorAxis(parent, x, y, z) { // for axis in both VPython and JS/RS environments
    	var oldaxis
        this.__parent = parent
        if (parent) oldaxis = norm(parent.__axis)
        this.__x = x
        this.__y = y
        this.__z = z
        if (parent) {
        	if (parent.__sizing) parent.__size.__x = Math.sqrt(x*x + y*y + z*z) // VPython but not sphere or ring or text
        	// Do not adjust up if in the process of rotating an object:
        	if (window.__adjustupaxis) adjust_up(parent, oldaxis, this)
        	parent.__change()
        }
    }
    attributeVectorAxis.prototype = new vec(1, 0, 0)
    attributeVectorAxis.prototype.constructor = attributeVectorAxis

    function attributeVectorSize(parent, x, y, z) { // for size in VPython environment
    	this.__parent = parent
        this.__x = x
        this.__y = y
        this.__z = z
        if (parent) {
        	if (parent.__sizing) { // VPython but not sphere or ring or text
                // Be careful not to alter the attributeVectorAxis character of parent.__axis
	            var v = parent.__axis.norm().multiply(x)
	        	parent.__axis.__x = v.x
	        	parent.__axis.__y = v.y
	        	parent.__axis.__z = v.z
        	}
        	parent.__change()
        }
    }
    attributeVectorSize.prototype = new vec(1,1,1)
    attributeVectorSize.prototype.constructor = attributeVectorSize

    function attributeVectorUp(parent, x, y, z) { // for size in VPython environment
    	var oldup
        this.__parent = parent
        if (parent) oldup = norm(parent.__up)
        this.__x = x
        this.__y = y
        this.__z = z
        if (parent) {
        	// Do not adjust axis if in the process of rotating an object:
        	if (window.__adjustupaxis) adjust_axis(parent, oldup, this)
        	parent.__change()
        }
    }
    attributeVectorUp.prototype = new vec(0,1,0)
    attributeVectorUp.prototype.constructor = attributeVectorUp
    
    // Ordinary attributeVector --------------------------------------------------------------------

    Object.defineProperty(attributeVector.prototype, '__x', { enumerable: false, writable: true, value: 0 })
    Object.defineProperty(attributeVector.prototype, 'x', {
        enumerable: true,
        get:
            function () { return this.__x },
        set:
            function (value) {
                this.__x = value
                this.__parent.__change()
            }
    });

    Object.defineProperty(attributeVector.prototype, '__y', { enumerable: false, writable: true, value: 0 })
    Object.defineProperty(attributeVector.prototype, 'y', {
        enumerable: true,
        get:
            function () { return this.__y },
        set:
            function (value) {
                this.__y = value
                this.__parent.__change()
            }
    });

    Object.defineProperty(attributeVector.prototype, '__z', { enumerable: false, writable: true, value: 0 })
    Object.defineProperty(attributeVector.prototype, 'z', {
        enumerable: true,
        get:
            function () { return this.__z },
        set:
            function (value) {
                this.__z = value
                this.__parent.__change()
            }
    });
    
    // attributeVectorPos for pos attribute ------------------------------------------------------

    Object.defineProperty(attributeVectorPos.prototype, '__x', { enumerable: false, writable: true, value: 0 })
    Object.defineProperty(attributeVectorPos.prototype, 'x', {
        enumerable: true,
        get:
            function () { return this.__x },
        set:
            function (value) {
                this.__x = value
                this.__parent.__change()
            	this.__parent._pos_set = true // needed by attach_trail updating
            	if (this.__parent.__make_trail) this.__parent.__update_trail(vec(this.__x, this.__y, this.__z))
            }
    });

    Object.defineProperty(attributeVectorPos.prototype, '__y', { enumerable: false, writable: true, value: 0 })
    Object.defineProperty(attributeVectorPos.prototype, 'y', {
        enumerable: true,
        get:
            function () { return this.__y },
        set:
            function (value) {
            	this.__y = value
                this.__parent.__change()
            	this.__parent._pos_set = true // needed by attach_trail updating
            	if (this.__parent.__make_trail) this.__parent.__update_trail(vec(this.__x, this.__y, this.__z))
            }
    });

    Object.defineProperty(attributeVectorPos.prototype, '__z', { enumerable: false, writable: true, value: 0 })
    Object.defineProperty(attributeVectorPos.prototype, 'z', {
        enumerable: true,
        get:
            function () { return this.__z },
        set:
            function (value) {
        		this.__z = value
                this.__parent.__change()
            	this.__parent._pos_set = true // needed by attach_trail updating
            	if (this.__parent.__make_trail) this.__parent.__update_trail(vec(this.__x, this.__y, this.__z))
            }
    });
    
    // attributeVectorAxis for axis attribute ------------------------------------------------------

    Object.defineProperty(attributeVectorAxis.prototype, '__x', { enumerable: false, writable: true, value: 0 })
    Object.defineProperty(attributeVectorAxis.prototype, 'x', {
        enumerable: true,
        get:
            function () { return this.__x },
        set:
            function (value) {
    			var oldaxis = norm(this.__parent.__axis)
                this.__x = value
				if (this.__parent.__sizing) this.__parent.__size.x = this.mag
				adjust_up(this.__parent, oldaxis, this)
            }
    });

    Object.defineProperty(attributeVectorAxis.prototype, '__y', { enumerable: false, writable: true, value: 0 })
    Object.defineProperty(attributeVectorAxis.prototype, 'y', {
        enumerable: true,
        get:
            function () { return this.__y },
        set:
            function (value) {
				var oldaxis = norm(this.__parent.__axis)
	            this.__y = value
				if (this.__parent.__sizing) this.__parent.__size.x = this.mag
	            adjust_up(this.__parent, oldaxis, this)
            }
    });

    Object.defineProperty(attributeVectorAxis.prototype, '__z', { enumerable: false, writable: true, value: 0 })
    Object.defineProperty(attributeVectorAxis.prototype, 'z', {
        enumerable: true,
        get:
            function () { return this.__z },
        set:
            function (value) {
				var oldaxis = norm(this.__parent.__axis)
	            this.__z = value
				if (this.__parent.__sizing) this.__parent.__size.x = this.mag
	            adjust_up(this.__parent, oldaxis, this)
            }
    });
    
    // attributeVectorSize for VPython size attribute --------------------------------------------------------

    Object.defineProperty(attributeVectorSize.prototype, '__x', { enumerable: false, writable: true, value: 0 })
    Object.defineProperty(attributeVectorSize.prototype, 'x', {
        enumerable: true,
        get:
            function () { return this.__x },
        set:
            function (value) {
                this.__x = value
                // Be careful not to alter the attributeVectorAxis character of this.__parent.__axis
                if (this.__parent.__sizing) {
	                var v = this.__parent.__axis.norm().multiply(value)
	            	this.__parent.__axis.__x = v.x
	            	this.__parent.__axis.__y = v.y
	            	this.__parent.__axis.__z = v.z
                }
                this.__parent.__change()
            }
    });

    Object.defineProperty(attributeVectorSize.prototype, '__y', { enumerable: false, writable: true, value: 0 })
    Object.defineProperty(attributeVectorSize.prototype, 'y', {
        enumerable: true,
        get:
            function () { return this.__y },
        set:
            function (value) {
                this.__y = value
                this.__parent.__change()
            }
    });

    Object.defineProperty(attributeVectorSize.prototype, '__z', { enumerable: false, writable: true, value: 0 })
    Object.defineProperty(attributeVectorSize.prototype, 'z', {
        enumerable: true,
        get:
            function () { return this.__z },
        set:
            function (value) {
                this.__z = value
                this.__parent.__change()
            }
    });
    
    // attributeVectorUp for up attribute ------------------------------------------------------

    Object.defineProperty(attributeVectorUp.prototype, '__x', { enumerable: false, writable: true, value: 0 })
    Object.defineProperty(attributeVectorUp.prototype, 'x', {
        enumerable: true,
        get:
            function () { return this.__x },
        set:
            function (value) {
				var oldup = norm(this.__parent.__up)
	            this.__x = value
	            adjust_axis(parent, oldup, this)
            }
    });

    Object.defineProperty(attributeVectorUp.prototype, '__y', { enumerable: false, writable: true, value: 0 })
    Object.defineProperty(attributeVectorUp.prototype, 'y', {
        enumerable: true,
        get:
            function () { return this.__y },
        set:
            function (value) {
			var oldup = norm(this.__parent.__up)
            this.__y = value
            adjust_axis(parent, oldup, this)
            }
    });

    Object.defineProperty(attributeVectorUp.prototype, '__z', { enumerable: false, writable: true, value: 0 })
    Object.defineProperty(attributeVectorUp.prototype, 'z', {
        enumerable: true,
        get:
            function () { return this.__z },
        set:
            function (value) {
				var oldup = norm(this.__parent.__up)
	            this.__z = value
	            adjust_axis(parent, oldup, this)
            }
    });
    
    // General vec properties

    vec.prototype.toString = function () {
        // Mimics the vector display of VPython
        var input = [this.x, this.y, this.z]
        var output = []
        var c, eloc, period, char, end
        for (var i = 0; i < 3; i++) {
            var c = input[i]
            if (c == 0) {
                output.push('0')
                continue
            }
            if (Math.abs(c) < 1e-4) c = c.toExponential(5)
            else c = c.toPrecision(6)
            period = c.indexOf('.')
            if (period >= 0) {
                end = c.indexOf('e')
                if (end < 0) end = c.length
                char = end
                while (true) {
                    char--
                    if (c.charAt(char) == '0') continue
                    if (char == period) {
                        output.push(c.slice(0, period).concat(c.slice(end, c.length)))
                        break
                    }
                    if (end == c.length) output.push(c.slice(0, char + 1))
                    else output.push(c.slice(0, char + 1).concat(c.slice(end, c.length)))
                    break
                }
            } else output.push(c)
        }
        return "< " + output[0] + ", " + output[1] + ", " + output[2] + " >"
    }

    // --------------------------------------------------------------------
    
    // Measurements show that including a scalar-vector test makes a
    // negligible difference in the speed of these vector operations.
    // The check costs about 0.3 ns, the operation takes about 18 ns.
    
    vec.prototype.add = function (v) {
    	if (!(v instanceof vec)) add_error()
        return new vec(this.x + v.x, this.y + v.y, this.z + v.z)
    }

    vec.prototype.sub = function (v) {
    	if (!(v instanceof vec)) sub_error()
        return new vec(this.x - v.x, this.y - v.y, this.z - v.z)
    }

    vec.prototype.multiply = function (r) {
    	if (r instanceof vec) multiply_error()
    	if (r === undefined || Number.isNaN(r)) badnumber(r)
        return new vec(this.x * r, this.y * r, this.z * r)
    }

    vec.prototype.divide = function (r) {
    	if (r instanceof vec) divide_error()
    	if (r === undefined || Number.isNaN(r)) badnumber(r)
        return new vec(this.x / r, this.y / r, this.z / r)
    }
    
    // ----------------------------------------------------------------------

    property.declare( vec.prototype, {
        mag: {
        	get: function () { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z) },
        	set: function (value) { 
        		var v = this.norm().multiply(value)
        		this.x = v.x
        		this.y = v.y
        		this.z = v.z
        	}
        },
        mag2: {
        	get: function () { return this.x * this.x + this.y * this.y + this.z * this.z },
        	set: function (value) {
        		var v = this.norm().multiply(Math.sqrt(value))
        		this.x = v.x
        		this.y = v.y
        		this.z = v.z
        	}
        },
        hat: {
        	get: function () { return this.norm() },
        	set: function (value) {
        		var v = value.hat.multiply(this.mag)
        		this.x = v.x
        		this.y = v.y
        		this.z = v.z
        	}
        }
        
        /*
        list: {
        		get: function() { return [this.x, this.y, this.z] },
        		set: function(value) {
        			if (this.__parent !== undefined) {
        				;
        			} else {
        				this.x = value[0]
        				this.y = value[1]
        				this.z = value[2]
        			}
        		}
        }
        */
    })

    vec.prototype.norm = function () {
        var r = this.mag
        if (r == 0) return new vec(0, 0, 0)
        return new vec(this.x / r, this.y / r, this.z / r)
    }

    vec.prototype.dot = function (v) {
        return this.x * v.x + this.y * v.y + this.z * v.z
    }

    vec.prototype.equals = function (v) {
    	if (v === null) return false
        return (this.x === v.x && this.y === v.y && this.z === v.z)
    }

    vec.prototype.proj = function (v) {
        var B = norm(v)
        return B.multiply(this.dot(B))
    }

    vec.prototype.comp = function (v) {
        return this.dot(norm(v))
    }

    vec.prototype.cross = function (v) {
        return new vec(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x)
    }

    vec.prototype.diff_angle = function (v) {
    	var a = this.norm().dot(v.norm())
    	if (a > 1) return 0 // guard against acos returning NaN
    	if (a < -1) return Math.PI
        return Math.acos(a)
    }

    vec.prototype.rotate = function (args) {
    	var angle, axis
	    if (arguments.length == 1) {
	        if (args !== null && args !== undefined) {
	        	if (typeof args === 'number') {
	        		angle = args
	        	} else {
		        	angle = args.angle
		        	axis = args.axis
	        	}
	        }
	    } else if (arguments.length == 2) {
        	angle = arguments[0]
        	axis = arguments[1]
        }
    	if (angle === undefined) throw new Error("To rotate a vector you must specify an angle.")
        if (axis === undefined) axis = new vec(0, 0, 1)
        if (angle === 0) return new vec(this.x, this.y, this.z)
        var axis = axis.norm()
        var parallel = axis.multiply(axis.dot(this)) // projection along axis
        var perp = axis.cross(this)
        var pmag = perp.mag // length of 'this' projected onto plane perpendicular to axis
        perp = perp.norm()
        var y = perp.cross(axis) // y, perp, axis is an orthogonal coordinate system
        var rotated = y.multiply(pmag * Math.cos(angle)).add(perp.multiply(pmag * Math.sin(angle)))
        return parallel.add(rotated)
    }

    vec.random = function () {
        return new vec(-1 + 2 * Math.random(), -1 + 2 * Math.random(), -1 + 2 * Math.random())
    }
    
    // Sept. 2017 testing: x = A+B where A and B are vectors takes about 18 nanoseconds, with or without a test.
    //    If A and B are scalars, this is about 11 ns without a vector test; about 16 ns with a test.
    //    Note that A*B must make a vector test to distinguish between scalar*vec and scalar*scalar.
    //    The validity test itself costs only a fraction of a nanosecond, but there is some kind of
    //    optimization by the JavaScript compiler that means that adding one test to the Number functions 
    //    adds about 5 ns, which doesn't happen with vec operations. It doesn't seem to matter whether
    //    the test is "r instanceof vec" or "r.x !== undefined". The 5 ns penalty comes from having a test.
    //    All of this was with Chrome. Surprisingly, Firefox does scalar+scalar in only 2.3 ns, with
    //    or without the validity check (but vector+vector is 20 ns, with or without check).
    //    Edge takes about 30 ns for scalar or vector addition, with or without validity check.

    function add_error()            { throw new Error("Cannot add a scalar and a vector.") }
    function sub_error()            { throw new Error("Cannot subtract a scalar and a vector.") }
    function multiply_error()       { throw new Error("Cannot multiply a vector by a vector.") }
    function divide_error()         { throw new Error("Cannot divide by a vector.") }
    function greater_error()        { throw new Error("Cannot use > with vectors.") }
    function less_error()           { throw new Error("Cannot use < with vectors.") }
    function greaterorequal_error() { throw new Error("Cannot use >= with vectors.") }
    function lessorequal_error()    { throw new Error("Cannot use <= with vectors.") }
    function plusequal_error()      { throw new Error("Cannot use += with a scalar and a vector.") }
    function minusequal_error()     { throw new Error("Cannot use -= with a scalar and a vector.") }
    function timesequal_error()     { throw new Error("Cannot use *= with a scalar and a vector.") }
    function divideequal_error()    { throw new Error("Cannot use /= with a scalar and a vector.") }
    // Could not make === and !== work in RapydScript environment
    //function equal_error()          { throw new Error("Cannot use == with a scalar and a vector.") }
    //function notequal_error()       { throw new Error("Cannot use != with a scalar and a vector.") }
    function badnumber(r) {
    	if (r === undefined) throw new Error("A variable is undefined.")
    	else throw new Error("A variable is 'NaN', not a number.")
    }
    
    // See compiling/papercomp.js for what drives these functions.
    String.prototype['+'] =  function (r) { return this + r }
    String.prototype['+='] = function (r) { return this + r } // in papercomp.js we build left = left+right

    Number.prototype['+'] =   function(r) {return (r instanceof vec) ? add_error() : this + r }
    Number.prototype['-'] =   function(r) {return (r instanceof vec) ? sub_error() : this - r }
    Number.prototype['*'] =   function(r) {return (r instanceof vec) ? r.multiply(this) : r * this }
    Number.prototype['/'] =   function(r) {return (r instanceof vec) ? divide_error() : this / r }
    Number.prototype['>'] =   function(r) {return (r instanceof vec) ? greater_error() : this > r}
    Number.prototype['<'] =   function(r) {return (r instanceof vec) ? less_error() : this < r}
    Number.prototype['>='] =  function(r) {return (r instanceof vec) ? greaterorequal_error() : this >= r}
    Number.prototype['<='] =  function(r) {return (r instanceof vec) ? lessorequal_error() : this <= r}
    Number.prototype['+='] =  function(r) {return (r instanceof vec) ? plusequal_error() : this + r}
    Number.prototype['-='] =  function(r) {return (r instanceof vec) ? minusequal_error() : this - r}
    Number.prototype['*='] =  function(r) {return (r instanceof vec) ? timesequal_error() : this * r}
    Number.prototype['/='] =  function(r) {return (r instanceof vec) ? divideequal_error() : this / r}
    Number.prototype['-u'] =  function () {return -this }
    // Could not make === and !== work in RapydScript environment
    //Number.prototype['==='] = function(r) {return (r instanceof vec) ? equal_error() : this === r}
    //Number.prototype['!=='] = function(r) {return (r instanceof vec) ? notequal_error() : this !== r}
    
    vec.prototype['+'] =    function(r) {return this.add(r) }
    vec.prototype['-'] =    function(r) {return this.sub(r) }
    vec.prototype['*'] =    function(r) {return this.multiply(r) }
    vec.prototype['/'] =    function(r) {return this.divide(r) }
    vec.prototype['>'] =    function(r) {greater_error() }
    vec.prototype['<'] =    function(r) {less_error() }
    vec.prototype['>='] =   function(r) {greaterorequal_error() }
    vec.prototype['<='] =   function(r) {lessorequal_error() }
    vec.prototype['+='] =   function(r) {return this.add(r)} // in papercomp.js we build left = left['+='](right)
    vec.prototype['-='] =   function(r) {return this.sub(r)} // in papercomp.js we build left = left['-='](right)
    vec.prototype['*='] =   function(r) {return this.multiply(r)} // in papercomp.js we build left = left['*='](right)
    vec.prototype['/='] =   function(r) {return this.divide(r)} // in papercomp.js we build left = left['/='](right)
    vec.prototype["-u"] =   function()  {return new vec(-this.x, -this.y, -this.z) }
    // Could not make === and !== work in RapydScript environment
    //vec.prototype['==='] =  function(r) {return (r instanceof vec) ? this.equal(r) : equal_error() }
    //vec.prototype['!=='] =  function(r) {return (r instanceof vec) ? this.notequal(r) : notequal_error() }

    var exports = { vec: vec, 
    		        attributeVector: attributeVector,
    		        attributeVectorPos: attributeVectorPos,
    		        attributeVectorAxis: attributeVectorAxis, 
    		        attributeVectorSize: attributeVectorSize, 
    		        attributeVectorUp: attributeVectorUp }
    Export(exports)
})()

; (function vectorLibraryWrappers() {
    "use strict";

    function mag(A) {
        return A.mag;
    }
    function mag2(A) {
        return A.mag2;
    }
    function norm(A) {
        return A.norm();
    }
    function hat(A) {
        return A.hat;
    }
    function dot(A,B) {
        return A.dot(B);
    }
    function cross(A,B) {
        return A.cross(B);
    }
    function proj(A,B) {
        return A.proj(B);
    }
    function comp(A,B) {
        return A.comp(B);
    }
    function diff_angle(A,B) {
        return A.diff_angle(B);
    }
    function rotate(args) {
    	var angle, axis
    	var v = arguments[0]
	    if (arguments.length == 2) {
	        var args = arguments[1]
	        if (args !== null && args !== undefined) {
	        	if (typeof args === 'number') {
	        		angle = args
	        	} else {
		        	angle = args.angle
		        	axis = args.axis
	        	}
	        }
        } else if (arguments.length == 3) {
        	angle = arguments[1]
        	axis = arguments[2]
        }
    	if (angle === undefined) throw new Error("To rotate a vector you must specify an angle.")
    	if (axis === undefined) axis = new vec(0,0,1)
        return v.rotate({angle:angle, axis:axis})
    }
    function GS_power(x,n) { // Preprocessing converts Math.pow => GS_power
    	if (x instanceof vec) throw new Error("Cannot raise a vector to a power.")
    	return Math.pow(x,n)
    }
    var exports = {
        mag: mag,
        mag2: mag2,
        norm: norm,
        hat: hat,
        dot: dot,
        cross: cross,
        proj: proj,
        comp: comp,
        diff_angle: diff_angle,
        rotate: rotate,
        GS_power: GS_power
    }
    Export(exports)
})();
