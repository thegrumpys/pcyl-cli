"use strict";
/**
 * TRADE command - probe trade-offs associated with constraint violations when
 * no feasible solution is available
 */
var despak = require('./despak');
var reset = require('./reset');
var sclden = require('./sclden');
var sprintf = require("sprintf-js").sprintf;
var srch = require('./srch');
var update = require('./update');
function trade(split_line) {
    var obj;
    var j;
    var nviol;
    var ldir = [];
    var vflag = [];
    var itemp;
    var dir = [];
    var c0;
    var c1;
    var c2;
    var c3;
    var rk1;
    var rk2;
    var rk3;
    var a;
    var b;
    var smc;
    var rk1ac;
    var rk2ab;
    var rk3bc;
    var capa;
    var capb;
    var capc;
    var arg;
    var bigest;
    var smalest;
    var tc = [];
    var temp;
    var temp1;
    var temp2;
    var value;
    /*
     * TRADE works with constant level constraints only.
     * 
     * VFLAG contains the indices of the violated constraints. The sub-set of
     * constraints indicated by vflag forms the "A" vector described in the
     * thesis.
     * 
     * Future work: make a single routine to set a constraint level; let it
     * worry about scaling denominators, etc.
     */
    console.log('TRADE: ');
    var top = true;
    while (top) {
        top = false;
        var p = [];
        for (let i = 0; i < design.design_parameters.length; i++) {
            var dp = design.design_parameters[i];
            p[i] = dp.value;
        }
        obj = despak(p);
        update();
        nviol = 0;
        for (let i = 0; i < design.design_parameters.length; i++) {
            var dp = design.design_parameters[i];
            if (dp.lmin == SETSTAT && dp.vmin > 0.0) {
                nviol++
                vflag[nviol - 1] = i;
                ldir[nviol - 1] = -1;
            } else if (dp.lmax == SETSTAT && dp.vmax > 0.0) {
                nviol++
                vflag[nviol - 1] = i;
                ldir[nviol - 1] = +1;
            }
        }
        for (let i = 0; i < design.state_variables.length; i++) {
            var sv = design.state_variables[i];
            if (sv.lmin == SETSTAT && sv.vmin > 0.0) {
                nviol++
                vflag[nviol - 1] = i + design.design_parameters.length;
                ldir[nviol - 1] = -1;
            } else if (sv.lmax == SETSTAT && sv.vmax > 0.0) {
                nviol++
                vflag[nviol - 1] = i + design.design_parameters.length;
                ldir[nviol - 1] = +1;
            }
        }
        if (obj <= OBJMIN || nviol == 0) {
            console.log('OBJ < OBJMIN - USE OF TRADE IS NOT APPROPRIATE.');
        } else {
            console.log('EXISTING CONSTRAINTS:');
            clister();
            var strategy = undefined;
            do {
                if (strategy === undefined) {
                    console.log('SPECIFY YOUR TRADE STRATEGY ...  RELAX CONSTRAINTS:');
                    console.log('        <enter>  OR  0  IN PROPORTION TO THEIR CURRENT VIOLATION');
                    console.log('                     1  IN AN ARBITRARY RATIO');
                    console.log('                     2  TO THE POINT OF THE EXISTING VIOLATIONS');
                    console.log('                     3  RETURN TO COMMAND LEVEL');
                    console.log(': ');
                    strategy = split_line.shift();
                    console.log('@@@ strategy=',strategy);
                }
                /* arbitrary ratio */
                if (strategy == '1') {
                    for (let i = 0; i < nviol; i++) {
                        j = vflag[i];
                        var value_string = undefined;
                        while (value_string === undefined) {
                            if (j < design.design_parameters.length) {
                                var dp = design.design_parameters[j];
                                var dname = dp.name;
                            } else {
                                var sv = design.state_variables[j - design.design_parameters.length];
                                var dname = sv.name;
                            }
                            console.log(sprintf('WEIGHT FOR %s: ', dname));
                            value_string = split_line.shift();
                            console.log('@@@ value_string=',value_string);
                        }
                        var value = parseFloat(value_string);
                        dir[i] = ldir[i] * value;
                    }
                }
                /* existing violations */
                else if (strategy == '2') {
                    for (let i = 0; i < nviol; i++) {
                        j = vflag[i];
                        if (j < design.design_parameters.length) {
                            var dp = design.design_parameters[j];
                            if (ldir[i] < 0) {
                                dp.cmin = dp.cmin + dp.vmin * dp.smin * ldir[i];
                                dp.smin = sclden(dp.value, dp.cmin, dp.sdlim, SETSTAT);
                            } else {
                                dp.cmax = dp.cmax + dp.vmax * dp.smax * ldir[i];
                                dp.smax = sclden(dp.value, dp.cmax, dp.sdlim, SETSTAT);
                            }
                        } else {
                            var sv = design.state_variables[j - design.design_parameters.length];
                            if (ldir[i] < 0) {
                                sv.cmin = sv.cmin + sv.vmin * sv.smin * ldir[i];
                                sv.smin = sclden(sv.value, sv.cmin, sv.sdlim, SETSTAT);
                            } else {
                                sv.cmax = sv.cmax + sv.vmax * sv.smax * ldir[i];
                                sv.smax = sclden(sv.value, sv.cmax, sv.sdlim, SETSTAT);
                            }
                        }
                    }
                    console.log('CONSTRAINT LEVELS RELAXED TO EXISTING VIOLATIONS.');
                    var p = [];
                    for (let i = 0; i < design.design_parameters.length; i++) {
                        var dp = design.design_parameters[i];
                        p[i] = dp.value;
                    }
                    obj = despak(p);
//                    console.log('obj2=',obj);
                    return;
                }
                /* return to command level */
                else if (strategy == '3') {
                    var p = [];
                    for (let i = 0; i < design.design_parameters.length; i++) {
                        var dp = design.design_parameters[i];
                        p[i] = dp.value;
                    }
                    obj = despak(p);
//                    console.log('obj3=',obj);
                    return;
                }
                /* in proportion to existing violation */
                else {
                    for (let i = 0; i < nviol; i++) {
                        j = vflag[i];
                        if (j < design.design_parameters.length) {
                            var dp = design.design_parameters[j];
                            if (ldir[i] < 0)
                                dir[i] = ldir[i] * dp.vmin;
                            else
                                dir[i] = ldir[i] * dp.vmax;
                        } else {
                            var sv = design.state_variables[j - design.design_parameters.length];
                            if (ldir[i] < 0)
                                dir[i] = ldir[i] * sv.vmin;
                            else
                                dir[i] = ldir[i] * sv.vmax;
                        }
                    }
                }
                /**
                 * **** CREATE normalized VECTOR IN VIOLATED CONSTRAINT SPACE
                 * *****
                 */
                value = 0.0;
                itemp = 0;
                for (let i = 0; i < nviol; i++) {
                    temp2 = Math.abs(dir[i]);
                    if (temp2 > value) {
                        value = temp2;
                        itemp = i;
                    }
                }
            } while (value < SMALLNUM);
            for (let i = 0; i < nviol; i++) {
                dir[i] = dir[i] / value;
                j = vflag[i];
                if (j < design.design_parameters.length) {
                    var dp = design.design_parameters[j];
                    if (ldir[i] < 0)
                        tc[i] = dp.cmin;
                    else
                        tc[i] = dp.cmax;
                } else {
                    var sv = design.state_variables[j - design.design_parameters.length];
                    if (ldir[i] < 0)
                        tc[i] = sv.cmin;
                    else
                        tc[i] = sv.cmax;
                }
            }
            c1 = 0.0
            rk1 = obj;
            var tagain = true;
            while (tagain) {
                tagain = false;
                /* estimate best step size */
                smalest = 1.0;
                bigest = 0.0;
                for (let i = 0; i < nviol; i++) {
                    temp2 = Math.abs(dir[i]);
                    j = vflag[i];
                    if (j < design.design_parameters.length) {
                        var dp = design.design_parameters[j];
                        if (ldir[i] < 0) {
                            if (temp2 > SMALLNUM) {
                                temp = dp.vmin / temp2;
                            } else {
                                temp = dp.vmin;
                            }
                        } else {
                            if (temp2 > SMALLNUM) {
                                temp = dp.vmax / temp2;
                            } else {
                                temp = dp.vmax;
                            }
                        }
                    } else {
                        var sv = design.state_variables[j - design.design_parameters.length];
                        if (ldir[i] < 0) {
                            if (temp2 > SMALLNUM) {
                                temp = sv.vmin / temp2;
                            } else {
                                temp = sv.vmin;
                            }
                        } else {
                            if (temp2 > SMALLNUM) {
                                temp = sv.vmax / temp2;
                            } else {
                               temp = sv.vmax;
                            }
                        }
                    }
                    if (temp > SMALLNUM && temp < smalest) {
                        smalest = temp;
                    }
                    if (temp > bigest) {
                        bigest = temp;
                    }
                }
                j = vflag[itemp];
                if (j < design.design_parameters.length) {
                    var dp = design.design_parameters[j];
                    if (ldir[itemp] < 0)
                        temp1 = 0.90 * dp.vmin;
                    else
                        temp1 = 0.90 * dp.vmax;
                } else {
                    var sv = design.state_variables[j - design.design_parameters.length];
                    if (ldir[itemp] < 0)
                        temp1 = 0.90 * sv.vmin;
                    else
                        temp1 = 0.90 * sv.vmax;
                }
                if (temp1 < 0.01)
                    temp1 = 0.01;
                do {
                    console.log('ENTER LOCAL EXPLORATION SIZE  (%)');
                    console.log(sprintf('POSSIBILITIES RANGE FROM%6.1f TO%6.1f', 90.0 * smalest, 100.0 * bigest));
                    console.log(sprintf('                 (DEFAULT =%6.1f %%)    : ', temp1 * 100.0));
                    // TODO: Fix prompt
                    var expSize = split_line.shift();
                    console.log('@@@ expSize=',expSize);
                    if (expSize === undefined)
                        c3 = temp1 * 100.0;
                    else {
                        c3 = parseFloat(expSize);
                    }
                    console.log(DESIGN_NAME + ': ' +c3);
                } while (c3 < SMALLNUM);
                c3 = c3 / 100.0;
                /**
                 * ***** TAKE FIRST EXPLORATORY RELAXATION STEP
                 * ******************
                 */
                for (let i = 0; i < nviol; i++) {
                    j = vflag[i];
                    if (j < design.design_parameters.length) {
                        var dp = design.design_parameters[j];
                        if (ldir[i] < 0) {
                            dp.cmin = dp.cmin + dir[i] * dp.cmin * c3;
                            dp.smin = sclden(dp.value, dp.cmin, dp.sdlim, SETSTAT);
                        } else {
                            dp.cmax = dp.cmax + dir[i] * dp.cmax * c3;
                            dp.smax = sclden(dp.value, dp.cmax, dp.sdlim, SETSTAT);
                        }
                    } else {
                        var sv = design.state_variables[j - design.design_parameters.length];
                        if (ldir[i] < 0) {
                            sv.cmin = sv.cmin + dir[i] * sv.cmin * c3;
                            sv.smin = sclden(sv.value, sv.cmin, sv.sdlim, SETSTAT);
                        } else {
                            sv.cmax = sv.cmax + dir[i] * sv.cmax * c3;
                            sv.smax = sclden(sv.value, sv.cmax, sv.sdlim, SETSTAT);
                        }
                    }
                }
                var p = [];
                for (let i = 0; i < design.design_parameters.length; i++) {
                    var dp = design.design_parameters[i];
                    p[i] = dp.value;
                }
                obj = despak(p);
//                console.log('obj4=',obj);
                if (obj > OBJMIN) {
                    obj = srch();
//                    console.log('obj5=',obj);
                }
                var notpos = true;
                while (notpos) {
                    notpos = false;
                    if (obj <= OBJMIN) {
                        console.log('A FEASIBLE POINT HAS BEEN ESTABLISHED.');
                        console.log('EXISTING CONSTRAINTS:')
                        clister();
                        console.log('SPECIFY:');
                        console.log('        <enter>  OR  0  TO RESTART WITH A SMALLER STEP SIZE');
                        console.log('                     1  TO RETURN TO COMMAND LEVEL WITH THESE CONSTRAINTS');
                        console.log(': ');
                        // TODO: Prompt for input, return choice
                        var feasible = split_line.shift();
                        console.log('@@@ feasible=',feasible);
                        if (feasible == '1') {
                            var p = [];
                            for (let i = 0; i < design.design_parameters.length; i++) {
                                var dp = design.design_parameters[i];
                                p[i] = dp.value;
                            }
                            obj = despak(p);
//                            console.log('obj6=',obj);
                            return;
                        }
                        for (let i = 0; i < nviol; i++) {
                            j = vflag[i];
                            if (j < design.design_parameters.length) {
                                var dp = design.design_parameters[j];
                                if (ldir[i] < 0) {
                                    dp.cmin = tc[i];
                                    dp.smin = sclden(dp.value, dp.cmin, dp.sdlim, SETSTAT);
                                } else {
                                    dp.cmax = tc[i];
                                    dp.smax = sclden(dp.value, dp.cmax, dp.sdlim, SETSTAT);
                                }
                            } else {
                                var sv = design.state_variables[j - design.design_parameters.length];
                                if (ldir[i] < 0) {
                                    sv.cmin = tc[i];
                                    sv.smin = sclden(sv.value, sv.cmin, sv.sdlim, SETSTAT);
                                } else {
                                    sv.cmax = tc[i];
                                    sv.smax = sclden(sv.value, sv.cmax, sv.sdlim, SETSTAT);
                                }
                            }
                        }
                        /* call to despak here ??? */
                        reset();
                        var tagain = true;
                    } else {
                        if (IOOPT > 1) {
                            console.log('TRIAL (FULL STEP) CONSTRAINTS:');
                            clister();
                        }
                        rk3 = obj;
                        /**
                         * **** MAKE SECOND EXPLORATORY STEP 1/2 WAY TO THE
                         * FIRST ONE ***
                         */
                        c2 = c3 / 2.0;
//                        var p = [];
//                        for (let i = 0; i < design.design_parameters.length; i++) {
//                            var dp = design.design_parameters[i];
//                            p[i] = dp.value;
//                        }
//                        obj = despak(p);
//                        console.log('obj6b=',obj);
                        for (let i = 0; i < nviol; i++) {
                            j = vflag[i];
//                            console.log('i=',i,' j=',j,' ldir[i]=',ldir[i],' tc[i]=',tc[i],' dir[i]=',dir[i],' c2=',c2);
                            if (j < design.design_parameters.length) {
                                var dp = design.design_parameters[j];
                                if (ldir[i] < 0) {
                                    dp.cmin = tc[i] + dir[i] * tc[i] * c2;
//                                    console.log('name=',dp.name,' MIN cmin=',dp.cmin);
                                    dp.smin = sclden(dp.value, dp.cmin, dp.sdlim, SETSTAT);
                                } else {
                                    dp.cmax = tc[i] + dir[i] * tc[i] * c2;
//                                    console.log('name=',dp.name,' MAX cmax=',dp.cmax);
                                    dp.smax = sclden(dp.value, dp.cmax, dp.sdlim, SETSTAT);
                                }
                            } else {
                                var sv = design.state_variables[j - design.design_parameters.length];
                                if (ldir[i] < 0) {
                                    sv.cmin = tc[i] + dir[i] * tc[i] * c2;
//                                    console.log('name=',sv.name,' MIN cmin=',sv.cmin);
                                    sv.smin = sclden(sv.value, sv.cmin, sv.sdlim, SETSTAT);
                                } else {
                                    sv.cmax = tc[i] + dir[i] * tc[i] * c2;
//                                    console.log('name=',sv.name,' MAX cmax=',sv.cmax);
                                    sv.smax = sclden(sv.value, sv.cmax, sv.sdlim, SETSTAT);
                                }
                            }
                        }
                        reset();
                        obj = srch();
//                        console.log('obj7=',obj);
                        if (obj <= OBJMIN)
                            notpos = true;
                    }
                }
            }
            if (IOOPT > 1) {
                console.log('TRIAL (HALF STEP) CONSTRAINTS:');
                clister();
            }
            rk2 = obj;
            /** ******** QUADRATIC EXTRAPOLATION ****************************** */
            /* REFER TO THESIS FIGURE 4-2 */
            /* FOR THE CASE THAT C1 ^= 0 : */
            /* A=C1-C2; */
            /* SMC=C1-C3; */
            /* CAPB= C1*(RK2AB-RK3BC) -C2*(RK1AC+RK3BC) +C3*(RK2AB-RK1AC); */
            /* CAPC= C2*C3*RK1AC -C1*C3*RK2AB +C1*C2*RK3BC; */
            /* HOWEVER IN THIS CASE C1=0, SO TERMS DROP OUT */
            a = -c2;
            b = c2 - c3;
            smc = -c3;
            rk1ac = rk1 / (a * smc);
            rk2ab = rk2 / (a * b);
            rk3bc = rk3 / (b * smc);
            capa = rk1ac - rk2ab + rk3bc;
            capb = -c2 * (rk1ac + rk3bc) + c3 * (rk2ab - rk1ac);
            capc = rk1;
            arg = capb * capb - 4.0 * capa * capc;
            if (arg < 0.0) {
                console.log('THERE MAY BE NO FEASIBLE SOLUTION IN THIS DIRECTION.');
                console.log('PARABOLA AXIS OF SYMMETRY:');
                c0 = -capb / (2.0 * capa);
            } else {
                /* TAKE SMALLER ROOT */
                c0 = (-capb - Math.sqrt(arg)) / (2.0 * capa);
                /** ******************************************************************* */
                console.log('EXTRAPOLATION INDICATES A FEASIBLE SOLUTION AT:');
            }
            for (let i = 0; i < nviol; i++) {
                j = vflag[i];
                if (j < design.design_parameters.length) {
                    var dp = design.design_parameters[j];
                    if (ldir[i] < 0) {
                        dp.cmin = tc[i] + dir[i] * tc[i] * c0;
                        dp.smin = sclden(dp.value, dp.cmin, dp.sdlim, SETSTAT);
                        console.log(sprintf('%-16s MIN%16.4f   %s', dp.name, dp.cmin, dp.units));
                    } else {
                        dp.cmax = tc[i] + dir[i] * tc[i] * c0;
                        dp.smax = sclden(dp.value, dp.cmax, dp.sdlim, SETSTAT);
                        console.log(sprintf('%-16s MAX%16.4f   %s', dp.name, dp.cmax, dp.units));
                    }
                } else {
                    var sv = design.state_variables[j - design.design_parameters.length];
                    if (ldir[i] < 0) {
                        sv.cmin = tc[i] + dir[i] * tc[i] * c0;
                        sv.smin = sclden(sv.value, sv.cmin, sv.sdlim, SETSTAT);
                        console.log(sprintf('%-16s MIN%16.4f   %s', sv.name, sv.cmin, sv.units));
                    } else {
                        sv.cmax = tc[i] + dir[i] * tc[i] * c0;
                        sv.smax = sclden(sv.value, sv.cmax, sv.sdlim, SETSTAT);
                        console.log(sprintf('%-16s MAX%16.4f   %s', sv.name, sv.cmax, sv.units));
                    }
                }
            }
            console.log('DO YOU WISH TO ESTABLISH THIS SET OF CONSTRAINTS ?  (y/N) : ');
            var establish = split_line.shift();
            console.log('@@@ establish=',establish);
            if (establish !== undefined && 'YES'.startsWith(establish)) {
                obj = srch();
                if (obj <= OBJMIN) {
                    console.log('THE RESULT IS FEASIBLE.');
                    var p = [];
                    for (let i = 0; i < design.design_parameters.length; i++) {
                        var dp = design.design_parameters[i];
                        p[i] = dp.value;
                    }
                    obj = despak(p);
                    return;
                }
                while (!top) {
                    console.log(sprintf('THE RESULT IS NOT FEASIBLE:    OBJ =%18.6f', obj));
                    console.log('SPECIFY:');
                    console.log('        <enter>  OR  0  TO MAKE ANOTHER EXTRAPOLATION SERIES');
                    console.log('                     1  TO RESTART FROM THE BEGINNING OF THIS SERIES');
                    console.log('                     2  TO RETURN TO COMMAND LEVEL WITH THESE CONSTRAINTS');
                    console.log(': ');
                    var notFeasible = split_line.shift();
                    console.log('@@@ notFeasible=',notFeasible);
                    if (notFeasible == '2') {
                        var p = [];
                        for (let i = 0; i < design.design_parameters.length; i++) {
                            var dp = design.design_parameters[i];
                            p[i] = dp.value;
                        }
                        obj = despak(p);
//                        console.log('obj10=',obj);
                        return;
                    }
                    if (notFeasible == '1') {
                        for (let i = 0; i < nviol; i++) {
                            j = vflag[i];
                            if (j < design.design_parameters.length) {
                                var dp = design.design_parameters[j];
                                if (ldir[i] < 0) {
                                    dp.cmin = tc[i];
                                    dp.smin = sclden(dp.value, dp.cmin, dp.sdlim, SETSTAT);
                                } else {
                                    dp.cmax = tc[i];
                                    dp.smax = sclden(dp.value, dp.cmax, dp.sdlim, SETSTAT);
                                }
                            } else {
                                var sv = design.state_variables[j - design.design_parameters.length];
                                if (ldir[i] < 0) {
                                    sv.cmin = tc[i];
                                    sv.smin = sclden(sv.value, sv.cmin, sv.sdlim, SETSTAT);
                                } else {
                                    sv.cmax = tc[i];
                                    sv.smax = sclden(sv.value, sv.cmax, sv.sdlim, SETSTAT);
                                }
                            }
                        }
                        reset();
                        top = true;
                    }
                    if (notFeasible == undefined || notFeasible == '0')
                        top = true;
                }
            } else { // establish N
                for (let i = 0; i < nviol; i++) {
                    j = vflag[i];
                    if (j < design.design_parameters.length) {
                        var dp = design.design_parameters[j];
                        if (ldir[i] < 0) {
                            dp.cmin = tc[i];
                            dp.smin = sclden(dp.value, dp.cmin, dp.sdlim, SETSTAT);
                        } else {
                            dp.cmax = tc[i];
                            dp.smax = sclden(dp.value, dp.cmax, dp.sdlim, SETSTAT);
                        }
                    } else {
                        var sv = design.state_variables[j - design.design_parameters.length];
                        if (ldir[i] < 0) {
                            sv.cmin = tc[i];
                            sv.smin = sclden(sv.value, sv.cmin, sv.sdlim, SETSTAT);
                        } else {
                            sv.cmax = tc[i];
                            sv.smax = sclden(sv.value, sv.cmax, sv.sdlim, SETSTAT);
                        }
                    }
                }
                reset();
            }
        }
    }
    var p = [];
    for (let i = 0; i < design.design_parameters.length; i++) {
        var dp = design.design_parameters[i];
        p[i] = dp.value;
    }
    obj = despak(p);
//    console.log('obj11=',obj);
    function clister() {
        console.log('CONSTRAINT                % VIOLATION           LEVEL');
        for (let i = 0; i < nviol; i++) {
            let j = vflag[i];
            if (j < design.design_parameters.length) {
                var dp = design.design_parameters[j];
                if (ldir[i] < 0)
                    console.log(sprintf('%-16s MIN%14.4f%18.4f   %s', dp.name, dp.vmin * 100.0, dp.cmin, dp.units));
                else
                    console.log(sprintf('%-16s MAX%14.4f%18.4f   %s', dp.name, dp.vmax * 100.0, dp.cmax, dp.units));
            } else {
                var sv = design.state_variables[j - design.design_parameters.length];
                if (ldir[i] < 0)
                    console.log(sprintf('%-16s MIN%14.4f%18.4f   %s', sv.name, sv.vmin * 100.0, sv.cmin, sv.units));
                else
                    console.log(sprintf('%-16s MAX%14.4f%18.4f   %s', sv.name, sv.vmax * 100.0, sv.cmax, sv.units));
            }
        }
    }
}
module.exports = trade;
