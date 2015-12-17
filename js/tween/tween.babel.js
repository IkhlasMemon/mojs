import h from '../h';
import t from './tweener';
import easing from '../easing/easing';

var Tween = class Tween {
  constructor(o={}) {
    this.o = o;
    this._declareDefaults(); this._extendDefaults();
    this._vars();
    return this;
  }

  /*
    Method to run the Tween
    @param  {Number} Start time
    @return {Object} Self
  */
  play(time) {
    this._setStartTime(time);
    !time && (t.add(this)); // this.state = 'play'
    return this;
  }

  /*
    Method to stop the Tween.
    @returns {Object} Self.
  */
  stop() { this.pause(); this._setProgress(0); return this; }

  /*
    Method to pause Tween.
    @returns {Object} Self.
  */
  pause() { this._removeFromTweener(); return this; }

  /*
    Method do declare defaults by this._defaults object
  */
  _declareDefaults() {
    this._defaults = {
      duration:               600,
      delay:                  0,
      repeat:                 0,
      yoyo:                   false,
      easing:                 'Linear.None',
      onStart:                null,
      onComplete:             null,
      onRepeatStart:          null,
      onRepeatComplete:       null,
      onFirstUpdate:          null,
      onUpdate:               null,
      isChained:              false
    }
  }
  /*
    Method to declare some vars.
  */
  _vars() {
    this.h = h;
    this.progress = 0;
    this._prevTime = -1;

    this._negativeShift = 0;
    // if negative delay was specified,
    // save it to _negativeShift property and
    // reset it back to 0
    if ( this._props.delay < 0 ) {
      this._negativeShift = this._props.delay;
      this._props.delay = 0;
    }

    return this._calcDimentions();
  }
  /*
    Method to calculate tween's dimentions.
  */
  _calcDimentions() {
    this._props.time       = this._props.duration + this._props.delay;
    this._props.repeatTime = this._props.time * (this._props.repeat + 1);
  }
  /*
    Method to extend defaults by options and put it in _props.
  */
  _extendDefaults() {
    this._props = {};
    for (var key in this._defaults) {
      if (Object.hasOwnProperty.call(this._defaults, key)) {
        var value = this._defaults[key];
        this._props[key] = (this.o[key] != null) ? this.o[key] : value;
        this._props.easing = easing.parseEasing(this.o.easing || this._defaults.easing);
        this.onUpdate     = this._props.onUpdate;
      }
    }
  }
  /*
    Method for setting start and end time to props.
    @param {Number(Timestamp)}, {Null}
    @returns this
  */
  _setStartTime(time) {
    var p = this._props;
    this._isCompleted = false; this._isRepeatCompleted = false;
    this._isStarted = false;
    
    time = (time == null) ? performance.now() : time;
    var shiftTime = (this._props.shiftTime || 0);
    p.startTime = time + p.delay + this._negativeShift + shiftTime;
    p.endTime   = p.startTime + p.repeatTime - p.delay;

    return this;
  }
  /*
    Method to update tween's progress.
    @param {Number}   Time from the parent regarding it's period size.
    @param {Boolean}  Indicates if parent progress grows.
    @param {Number}   Parent's current period number.
    @param {Number}   Parent's previous period number.
  */
  _update(time, isGrow) {
    // We need to know what direction we are heading in with this tween,
    // so if we don't have the previous update value - this is very first
    // update, - skip it entirely and wait for the next value
    this.o.isIt && console.log(`XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`);
    this.o.isIt && console.log(`tween:`);
    this.o.isIt && this._visualizeProgress(time);
    if ( this._prevTime === -1 ) {
      this.o.isIt && console.log(`SKIP`);
      this._prevTime = time;
      this._wasUknownUpdate = true;
      return false;
    }
    /*
      if time is inside the active area of the tween.
      active area is the area from start time to end time,
      with all the repeat and delays in it
    */
    var props = this._props;
    if ((time >= this._props.startTime) && (time <= this._props.endTime)) {
      this._updateInActiveArea(time);
    } else {
      // complete if time is larger then end time
      // probably we must check for direction too
      if ( time > this._props.endTime && !this._isCompleted && this._isInActiveArea ) {
        // get period number
        var T = this._getPeriod( props.endTime );
        this._setProgress( ((this.o.yoyo && (T % 2 === 0)) ? 0 : 1), time );
        this._repeatComplete( time );
        this._complete( time );
      }

      // if was active and went to - inactive area "-"
      if ( time < this._prevTime && time < this._props.startTime ) {
        // if was in active area and didn't fire onStart callback
        if ( !this._isStarted && this._isInActiveArea ) {
          this._setProgress( 0, time );
          this._repeatStart( time );
          this._start( time );
        }
      }
      this._isInActiveArea = false;
    }

    this._prevTime = time;
    return this._isCompleted;
  }
  /*
    Method to handle tween's progress in active area.
    @param {Number} Current update time.
  */
  _updateInActiveArea(time) {
    // reset callback flags
    this._isCompleted = false;
    
    var props         = this._props,
        delayDuration = props.delay + props.duration,
        startPoint    = props.startTime - props.delay,
        elapsed       = (time - props.startTime + props.delay) % delayDuration,
        TCount        = Math.round( (props.endTime - props.startTime + props.delay) / delayDuration ),
        T             = this._getPeriod(time),
        TValue        = this._delayT,
        prevT         = this._getPeriod(this._prevTime),
        TPrevValue    = this._delayT;

    // "zero" and "one" value regarding yoyo and it's period
    var yoyoZero = ((props.yoyo && (T % 2 === 1)) ? 1 : 0),
        yoyoOne  = 1-yoyoZero;

    if ( time === this._props.endTime ) {
      this._wasUknownUpdate = false;
      this.o.isIt && console.log(`time: ${time}, end: ${this._props.endTime}, prev: ${this._prevTime}`);
      this.o.isIt && console.log(`T: ${T}`);
      this.o.isIt && console.log( 'THERE 6', yoyoOne );
      // if `time` is equal to `endTime`, T is equal to the next period,
      // so we need to decrement T and calculate "one" value regarding yoyo
      this._setProgress( ((props.yoyo && ((T-1) % 2 === 1)) ? 0 : 1), time );
      this._repeatComplete( time );
      return this._complete( time );
    }

    this.o.isIt && console.log(`TCount: ${TCount}`);
    this.o.isIt && console.log(`T: ${T}, prevT: ${prevT}, time: ${time} _prevTime: ${this._prevTime}`);

    // if time is inside the duration area of the tween
    if ( startPoint + elapsed >= props.startTime ) {
      this._isInActiveArea = true; this._isRepeatCompleted = false;
      this._isRepeatStart = false; this._isStarted = false;
      // active zone or larger then end
      var elapsed2 = ( time - props.startTime) % delayDuration,
          proc = elapsed2 / props.duration;
      // |=====|=====|=====| >>>
      //      ^1^2
      var isOnEdge = (T > 0) && (prevT < T);
      // |=====|=====|=====| <<<
      //      ^2^1
      var isOnReverseEdge = (prevT > T);

      if ( this._wasUknownUpdate ) {
        if ( time > this._prevTime ) {
          this._start( time );
          this._repeatStart( time );
          this._firstUpdate( time );
          this._setProgress( 0, time );
        }
        if ( time < this._prevTime ) {
          this._complete( time );
          this._repeatComplete( time );
          this._firstUpdate(time);
          this._setProgress(1, time);
        }
      }

      if ( isOnEdge ) {
        // if not just after delay
        // |=====|---=====|---=====| >>>
        //         ^1 ^2
        // because we have already handled
        // 1 and onRepeatComplete in delay gap
        if (this.progress !== 1) {
          this._setProgress(1, time);
          this._repeatComplete(time);
        }
        // if on edge but not at very start
        // |=====|=====|=====| >>>
        // ^!    ^here ^here           
        if ( prevT >= 0 ) {
          this._repeatStart(time);

          this._setProgress( yoyoZero , time);
        }
      }

      if ( time > this._prevTime ) {

        // 
        //  |=====|=====|=====| >>>
        // ^1  ^2
        if ( !this._isStarted && this._prevTime <= props.startTime ) {
          this._start( time );
          this._repeatStart( time );
          // it was zero anyways
          // this._setProgress( yoyoZero , time);

          // restart flags immediately in case if we will
          // return to '-' inactive area on the next step
          this._isStarted = false;
          this._isRepeatStart = false;
        }
        this._firstUpdate( time );
      }

      if ( isOnReverseEdge ) {
        // if on edge but not at very end
        // |=====|=====|=====| <<<
        //       ^here ^here ^not here     
        if ( this.progress !== 0 && this.progress !== 1 && prevT != TCount) {
          this._setProgress( 0, time );
          this._repeatStart( time );
        }

        // if on very end edge
        // |=====|=====|=====| <<<
        //       ^!    ^! ^2 ^1
        // we have handled the case in this._wasUknownUpdate
        // block so filter that
        if ( prevT === TCount && !this._wasUknownUpdate ) {
          this._complete( time );
          this._repeatComplete( time );              
          this._firstUpdate( time);
          this._setProgress( 1, time );
          // reset isComplete flag call
          // cuz we returned to active area
          this._isCompleted = false;
        }
        // change order regarding direction
        if ( time > this._prevTime ) {
          this._setProgress(1, time);
          this._repeatComplete(time);
        } else {
          this._repeatComplete(time);
          this._setProgress(yoyoOne, time);
        }
      }

      if ( prevT === 'delay') {
        // if just before delay gap
        // |---=====|---=====|---=====| >>>
        //               ^2    ^1
        if ( T < TPrevValue ) {
          this._repeatComplete(time);
          this._setProgress(yoyoOne, time);
        }
        // if just after delay gap
        // |---=====|---=====|---=====| >>>
        //            ^1  ^2
        if ( T === TPrevValue && T > 0 ) {
          this._repeatStart(time);
          this._setProgress(yoyoZero, time);
        }
      }

      if ( time !== props.endTime ) {
        this._setProgress(
          (props.yoyo && (T % 2 === 1)) ? 1-proc : proc,
          time
        );
      }
      // if progress is equal 0 and progress grows
      if ( proc === 0 ) {
        this._repeatStart(time);
      }

      if ( time === props.startTime ) {
        this._start( time );
      }
    // delay gap
    } else {
      // because T will be string of "delay" here,
      // let's normalize it be setting to TValue
      var t = (T === 'delay') ? TValue : T,
          isGrows = time > this._prevTime;
      // decrement period if forward direction of update
      isGrows && t--;
      // calculate normalized yoyoZero value
      yoyoZero = ((props.yoyo && (t % 2 === 1)) ? 1 : 0);
      // if was in active area and previous time was larger
      // |---=====|---=====|---=====| <<<
      //   ^2 ^1    ^2 ^1    ^2 ^1
      if ( this._isInActiveArea && time < this._prevTime ) {
        this._setProgress(yoyoZero, time);
        this._repeatStart(time);
      }
      // set 1 or 0 regarding direction and yoyo
      this._setProgress( (( isGrows ) ? 1-yoyoZero : yoyoZero ), time );
      // if reverse direction and in delay gap, then progress will be 0
      // if so we don't need to call the onRepeatComplete callback
      // |---=====|---=====|---=====| <<<
      //   ^0       ^0       ^0   
      // OR we have flipped 0 to 1 regarding yoyo option
      if ( this.progress !== 0 || yoyoZero === 1 ) { this._repeatComplete(time); }
      // set flag to indicate inactive area
      this._isInActiveArea = false;
    }
    // we've got the first update now
    this._wasUknownUpdate = false;
  }
  /*
    Method to set Tween's progress.
    @param {Number} Progress to set.
    @param {Number} Current update time.
    @returns {Object} Self.
  */
  _setProgress (p, time) {
    this.progress = p;
    this.easedProgress = this._props.easing(this.progress);
    if ( this._props.prevEasedProgress !== this.easedProgress ) {
      if (this.onUpdate != null && typeof this.onUpdate === 'function') {
        this.o.isIt && console.log(`********** ONUPDATE ${p} **********`);
        this.onUpdate( this.easedProgress, this.progress, time > this._prevTime );
      }
    } else { this.o.isIt && console.log(`********** ONUPDATE TRYOUT **********`); }
    this._props.prevEasedProgress = this.easedProgress;
    return this;
  }

  /*
    Method to set property[s] on Tween
    @param {Object, String} Hash object of key/value pairs, or property name
    @param {_} Property's value to set
  */
  _setProp(obj, value) {
    // handle hash object case
    if (typeof obj === 'object') {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          this._props[key] = obj[key];
          if (key === 'easing') {
            this._props.easing = easing.parseEasing(this._props.easing);
          }
        }
      }
    // handle key, value case
    } else if (typeof obj === 'string') {
      // if key is easing - parse it immediately
      if ( obj === 'easing' ) { this._props.easing = easing.parseEasing(value); }
      // else just save it to props
      else { this._props[obj] = value; }
    }
    this._calcDimentions();
  }
  /*
    Method to remove the Tween from the tweener.
    @returns {Onject} Self.
  */
  _removeFromTweener() { t.remove(this); return this; }

  /*
    Method to get current period number
    @param {Number} Time to get the period for.
    @returns {Number} Current period number.
  */
  _getPeriod(time) {
    var p       = this._props,
        TTime   = p.delay + p.duration,
        dTime   = time - p.startTime + p.delay,
        T       = dTime / TTime,
        elapsed = dTime % TTime;
    // If the latest period, round the result, otherwise floor it.
    // Basically we always can floor the result, but because of js
    // precision issues, sometimes the result is 2.99999998 which
    // will result in 2 instead of 3 after the floor operation.
    T = ( time >= p.endTime ) ? Math.round(T) : Math.floor(T);
    // if time is larger then the end time
    if ( time > p.endTime ) {
      // set equal to the periods count
      T = Math.round( (p.endTime - p.startTime + p.delay) / TTime );
    // if in delay gap, set _delayT to current
    // period number and return "delay"
    } else if ( elapsed > 0 && elapsed < p.delay ) {
      this._delayT = T; T = 'delay';
    }
    // if the end of period and there is a delay
    return T;
  }

  /*
    Method to set tween's state to start
    @method _start
    @param {Number} Progress to set.
  */
  _start(time) {
    if ( this._isStarted ) { return; }
    if (this._props.onStart != null && typeof this._props.onStart === 'function') {
      this.o.isIt && console.log("********** START **********");
      this._props.onStart.call(this, time > this._prevTime );
    }
    this._isCompleted = false; this._isStarted = true;
    this._isFirstUpdate = false;
  }

  /*
    Method to set tween's state to complete.
    @method _complete
    @param {Number} Current time.
  */
  _complete(time) {
    if ( this._isCompleted ) { return; }
    // this._setProgress(progress, time);
    // this._repeatComplete(time);
    if (this._props.onComplete != null && typeof this._props.onComplete === 'function') {
      this.o.isIt && console.log("********** COMPLETE **********");
      this._props.onComplete.call(this, time > this._prevTime );
    }
    this._isCompleted = true; this._isStarted = false;
    this._isFirstUpdate = false;
  }

  /*
    Method to run onFirstUpdate callback.
    @method _firstUpdate
    @param {Number} Current update time.
  */
  _firstUpdate(time) {
    if ( this._isFirstUpdate ) { return; }
    if (this._props.onFirstUpdate != null && typeof this._props.onFirstUpdate === 'function') {
      this.o.isIt && console.log("********** ON_FIRST_UPDATE **********");
      this._props.onFirstUpdate.call( this, time > this._prevTime );
    }
    this._isFirstUpdate = true;
  }

  /*
    Method call onRepeatComplete calback and set flags.
    @param {Number} Current update time.
  */
  _repeatComplete(time) {
    if (this._isRepeatCompleted) { return; }
    if (this._props.onRepeatComplete != null && typeof this._props.onRepeatComplete === 'function') {
      this.o.isIt && console.log("********** REPEAT COMPLETE **********");
      this._props.onRepeatComplete.call( this, time > this._prevTime );
    }
    this._isRepeatCompleted = true;
  }

  /*
    Method call onRepeatStart calback and set flags.
    @param {Number} Current update time.
  */
  _repeatStart(time) {
    if (this._isRepeatStart) { return; }
    if (this._props.onRepeatStart != null && typeof this._props.onRepeatStart === 'function') {
      this.o.isIt && console.log("********** REPEAT START **********");
      this._props.onRepeatStart.call( this, time > this._prevTime );
    }
    this._isRepeatStart = true;
  }

  // _visualizeProgress(time) {
  //   var str = '|',
  //       procStr = ' ',
  //       p = this._props,
  //       proc = p.startTime - p.delay;

  //   while ( proc < p.endTime ) {
  //     if (p.delay > 0 ) {
  //       var newProc = proc + p.delay;
  //       if ( time > proc && time < newProc ) {
  //         procStr += ' ^ ';
  //       } else {
  //         procStr += '   ';
  //       }
  //       proc = newProc;
  //       str  += '---';
  //     }
  //     var newProc = proc + p.duration;
  //     if ( time > proc && time < newProc ) {
  //       procStr += '  ^   ';
  //     } else if (time === proc) {
  //       procStr += '^     ';
  //     } else if (time === newProc) {
  //       procStr += '    ^ ';
  //     } else {
  //       procStr += '      ';
  //     }
  //     proc = newProc;
  //     str += '=====|';
  //   }

  //   console.log(str);
  //   console.log(procStr);
  // }
}

export default Tween;

