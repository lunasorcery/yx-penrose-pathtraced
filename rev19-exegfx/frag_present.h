/* File generated with Shader Minifier 1.1.6
 * http://www.ctrl-alt-test.fr
 */
#ifndef FRAG_PRESENT_H_
# define FRAG_PRESENT_H_
# define VAR_T "g"

const char *present_frag =
 "#version 120\n"
 "#define R gl_TexCoord[0].xy\n"
 "#define S gl_TexCoord[0].z\n"
 "uniform sampler2D g;"
 "void main()"
 "{"
   "vec2 v=gl_FragCoord.xy/R;"
   "vec3 d=texture2D(g,v).xyz*1.2/S;"
   "v-=.5;"
   "d+=dot(v,v)*.5;"
   "d=pow(d,.45*vec3(1.2,1.1,1));"
   "gl_FragColor.xyz=d;"
 "}";

#endif // FRAG_PRESENT_H_
