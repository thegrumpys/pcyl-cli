"use strict";
/**
 * FIX command - apply fixed status to design parameter or state variable
 */
var count = require('./count');
var sclden = require('./sclden');
var sprintf = require("sprintf-js").sprintf;

function fix(split_line) {
    //    FIX:
    //        if len1(2) = 0 then do;
    //           put skip edit
    //               ('FIX:',
    //                'ENTER NAME OF VARIABLE TO BE FIXED')
    //               (a, skip);
    //           go to instrt;
    //           end;
    //
    if (split_line == '') {
        console.log('FIX:');
        console.log('ENTER NAME OF VARIABLE TO BE FIXED');
        return;
    }
    //
    var hits = false;
    var gotNum = false;
    var inputFloat;
    //    
    if (isNaN(split_line[1]))
        gotNum = false;
    else {
        gotNum = true;
        inputFloat = parseFloat(split_line[1]);
    }
    //
    //        DO I=1 TO N;
    for (let i = 0; i < design_parameters.length; i++) {
        var dp = design_parameters[i];
        //        IF OP(2) = SUBSTR(PARM_NAME(I),KONE,LEN1(2)) THEN DO;
        if (dp.name.startsWith(split_line[0])) {
            //             IF OP(3) ^= '' THEN p(i)=op(3);
            if (gotNum)
                dp.value = inputFloat;
            //             lmin(I)=2;
            dp.lmin = FIXEDSTAT;
            //             lmax(I)=2;
            dp.lmax = FIXEDSTAT;
            //             cmin(i)=p(i);
            dp.cmin = dp.value;
            //             cmax(i)=p(i);
            dp.cmax = dp.value;
            //             PUT SKIP EDIT
            //                 (PARM_NAME(I), ' IS FIXED AT ', P(I), '   ', PARM_UNIT(I))
            //                 (2A, F(14,4), 2A);
            var output = sprintf('%s IS FIXED AT %14.4f   %s', dp.name, dp.value, dp.units);
            console.log(output);
            //             CALL COUNT;
            count();
            //             GO TO INSTRT;
            return;
            //             END;
        }
        //        END;
    }
    //        DO I=1 TO K;
    for (let i = 0; i < state_variables.length; i++) {
        var sv = state_variables[i];
        //        IF OP(2) = SUBSTR(ST_VAR_NAME(I),KONE,LEN1(2)) THEN DO;
        if (sv.name.startsWith(split_line[0])) {
            //             IM=I+N;
            //             IF OP(3) ^= '' THEN do;
            if (gotNum) {
                //                   cmin(im)=op(3);
                sv.cmin = inputFloat;
                //                   cmax(im)=op(3);
                sv.cmax = inputFloat;
                //                   end;
            }
            //                    ELSE do;
            else {
                //                   cmin(IM)=X(I);
                sv.cmin = sv.value;
                //                   cmax(IM)=X(I);
                sv.cmax = sv.value;
                //                   end;
            }
            //             lmin(im)=FIXEDSTAT;
            sv.lmin = FIXEDSTAT;
            //             lmax(im)=FIXEDSTAT;
            sv.lmax = FIXEDSTAT;
            //             Smin(IM)=sclden(x(i),cmin(im),sdlim(im),FIXEDSTAT);
            sv.smin = sclden(sv.value, sv.cmin, sv.sdlim, sv.lmin);
            //             Smax(IM)=sclden(x(i),cmax(im),sdlim(im),FIXEDSTAT);
            sv.smax = sclden(sv.value, sv.cmax, sv.sdlim, sv.lmax);
            //             if ioopt > 2 & msgsw(1) = 0 then do;
            //             put skip edit
            //                 (st_var_name(i), ' IS A DEPENDENT VARIABLE.',
            //                  'REMEMBER THAT A SEARCH WILL BE REQUIRED TO ',
            //                  'ESTABLISH THE DESIRED VALUE.')
            //                 (2a, skip);
            var output = sprintf('%s IS A DEPENDENT VARIABLE.', sv.name);
            console.log(output);
            console.log('REMEMBER THAT A SEARCH WILL BE REQUIRED TO ESTABLISH THE DESIRED VALUE.');
            //             msgsw(1)=1;
            //             end;
            //             PUT SKIP(2) EDIT
            //            (ST_VAR_NAME(I), ' IS FIXED AT ', Cmin(IM),
            //             '   ', ST_VAR_UNIT(I))
            //            (2A, F(14,4), 2A);
            output = sprintf("%s IS FIXED AT %14.4f   %s", sv.name, sv.cmin, sv.units);
            console.log(output);
            //             CALL COUNT;
            count();
            //             GO TO INSTRT;
            return;
            //             END;
        }
        //        END;
    }
    //        PUT SKIP(2) EDIT(OP(2),   ' ? ?') (A, A);
    //        GO TO instrt;
    if (!hits)
        console.log(split_line[0] + ' ? ?');

}

module.exports = fix;
