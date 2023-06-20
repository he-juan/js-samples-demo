/*
 * alawmulaw: A-Law and mu-Law codecs in JavaScript.
 * https://github.com/rochars/alawmulaw
 *
 * Copyright (c) 2018-2019 Rafael da Silva Rocha.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

/**
 * @fileoverview mu-Law codec.
 * @see https://github.com/rochars/wavefile
 * @see https://github.com/rochars/alawmulaw
 */

let alawmulaw = {
    /**
     * @fileoverview mu-Law codec.
     */
    mulaw: {
        /**
         * @type {number}
         * @private
         */
        BIAS: 0x84,
        /**
         * @type {number}
         * @private
         */
        CLIP: 32635,
        /**
         * @type {Array<number>}
         * @private
         */
        encodeTable: [
            0,0,1,1,2,2,2,2,3,3,3,3,3,3,3,3,
            4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,
            5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
            5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
            6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
            6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
            6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
            6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        ],
        /**
         * @type {Array<number>}
         * @private
         */
        decodeTable: [0,132,396,924,1980,4092,8316,16764],

        /**
         * Encode a 16-bit linear PCM sample as 8-bit mu-Law.
         * @param {number} sample A 16-bit PCM sample
         * @return {number}
         */
        encodeSample: function (sample){
            /** @type {number} */
            let sign;
            /** @type {number} */
            let exponent;
            /** @type {number} */
            let mantissa;
            /** @type {number} */
            let muLawSample;
            /** get the sample into sign-magnitude **/
            sign = (sample >> 8) & 0x80;
            if (sign != 0) sample = -sample;
            /** convert from 16 bit linear to ulaw **/
            sample = sample + this.BIAS;
            if (sample > this.CLIP) sample = this.CLIP;
            exponent = this.encodeTable[(sample>>7) & 0xFF];
            mantissa = (sample >> (exponent+3)) & 0x0F;
            muLawSample = ~(sign | (exponent << 4) | mantissa);
            /** return the result **/
            return muLawSample;
        },

        /**
         * Decode a 8-bit mu-Law sample as 16-bit PCM.
         * @param {number} muLawSample The 8-bit mu-Law sample
         * @return {number}
         */
        decodeSample: function (muLawSample){
            /** @type {number} */
            let sign;
            /** @type {number} */
            let exponent;
            /** @type {number} */
            let mantissa;
            /** @type {number} */
            let sample;
            muLawSample = ~muLawSample;
            sign = (muLawSample & 0x80);
            exponent = (muLawSample >> 4) & 0x07;
            mantissa = muLawSample & 0x0F;
            sample = this.decodeTable[exponent] + (mantissa << (exponent+3));
            if (sign != 0) sample = -sample;
            return sample;
        },

        /**
         * Encode 16-bit linear PCM samples into 8-bit mu-Law samples.
         * @param {!Int16Array} samples A array of 16-bit PCM samples.
         * @return {!Uint8Array}
         */
        encode: function (samples){
            /** @type {!Uint8Array} */
            let muLawSamples = new Uint8Array(samples.length);
            for (let i = 0, len = samples.length; i < len; i++) {
                muLawSamples[i] = this.encodeSample(samples[i]);
            }
            return muLawSamples;
        },

        /**
         * Decode 8-bit mu-Law samples into 16-bit PCM samples.
         * @param {!Uint8Array} samples A array of 8-bit mu-Law samples.
         * @return {!Int16Array}
         */
        decode: function (samples){
            /** @type {!Int16Array} */
            let pcmSamples = new Int16Array(samples.length);
            for (let i = 0, len = samples.length; i < len; i++) {
                pcmSamples[i] = this.decodeSample(samples[i]);
            }
            return pcmSamples;
        }
    },

    /**
     * @fileoverview A-Law codec.
     */
    alaw: {
        /** @type {!Array<number>} */
        LOG_TABLE: [
            1,1,2,2,3,3,3,3,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
            6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
        ],

        /**
         * Encode a 16-bit linear PCM sample as 8-bit A-Law.
         * @param {number} sample A 16-bit PCM sample
         * @return {number}
         */
        encodeSample: function (sample){
            /** @type {number} */
            let compandedValue;
            sample = (sample ==-32768) ? -32767 : sample;
            /** @type {number} */
            let sign = ((~sample) >> 8) & 0x80;
            if (!sign) {
                sample = sample * -1;
            }
            if (sample > 32635) {
                sample = 32635;
            }
            if (sample >= 256)  {
                /** @type {number} */
                let exponent = this.LOG_TABLE[(sample >> 8) & 0x7F];
                /** @type {number} */
                let mantissa = (sample >> (exponent + 3) ) & 0x0F;
                compandedValue = ((exponent << 4) | mantissa);
            } else {
                compandedValue = sample >> 4;
            }
            return compandedValue ^ (sign ^ 0x55);
        },

        /**
         * Decode a 8-bit A-Law sample as 16-bit PCM.
         * @param {number} aLawSample The 8-bit A-Law sample
         * @return {number}
         */
        decodeSample: function (aLawSample){
            /** @type {number} */
            let sign = 0;
            aLawSample ^= 0x55;
            if (aLawSample & 0x80) {
                aLawSample &= ~(1 << 7);
                sign = -1;
            }
            /** @type {number} */
            let position = ((aLawSample & 0xF0) >> 4) + 4;
            /** @type {number} */
            let decoded = 0;
            if (position != 4) {
                decoded = ((1 << position) |
                    ((aLawSample & 0x0F) << (position - 4)) |
                    (1 << (position - 5)));
            } else {
                decoded = (aLawSample << 1)|1;
            }
            decoded = (sign === 0) ? (decoded) : (-decoded);
            return (decoded * 8) * -1;
        },

        /**
         * Encode 16-bit linear PCM samples as 8-bit A-Law samples.
         * @param {!Int16Array} samples A array of 16-bit PCM samples.
         * @return {!Uint8Array}
         */
        encode: function (samples){
            /** @type {!Uint8Array} */
            let aLawSamples = new Uint8Array(samples.length);
            for (let i=0; i<samples.length; i++) {
                aLawSamples[i] = this.encodeSample(samples[i]);
            }
            return aLawSamples;
        },

        /**
         * Decode 8-bit A-Law samples into 16-bit linear PCM samples.
         * @param {!Uint8Array} samples A array of 8-bit A-Law samples.
         * @return {!Int16Array}
         */
        decode: function (samples){
            /** @type {!Int16Array} */
            let pcmSamples = new Int16Array(samples.length);
            for (let i=0; i<samples.length; i++) {
                pcmSamples[i] = this.decodeSample(samples[i]);
            }
            return pcmSamples;
        },
    }
}
