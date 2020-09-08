function bytesToDouble(str,start) {
    start *= 8;
    var data = [str.charCodeAt(start+7),
                str.charCodeAt(start+6),
                str.charCodeAt(start+5),
                str.charCodeAt(start+4),
                str.charCodeAt(start+3),
                str.charCodeAt(start+2),
                str.charCodeAt(start+1),
                str.charCodeAt(start+0)];

    var sign = (data[0] & 1<<7)>>7;

    var exponent = (((data[0] & 127) << 4) | (data[1]&(15<<4))>>4);

    if(exponent == 0) return 0;
    if(exponent == 0x7ff) return (sign) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

    var mul = Math.pow(2,exponent - 1023 - 52);
    var mantissa = data[7]+
        data[6]*Math.pow(2,8*1)+
        data[5]*Math.pow(2,8*2)+
        data[4]*Math.pow(2,8*3)+
        data[3]*Math.pow(2,8*4)+
        data[2]*Math.pow(2,8*5)+
        (data[1]&15)*Math.pow(2,8*6)+
        Math.pow(2,52);

    return Math.pow(-1,sign)*mantissa*mul;
}

//util
module.exports.getFileExtension = function (filename) {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
}