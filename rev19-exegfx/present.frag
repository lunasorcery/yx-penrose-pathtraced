#version 120
#define R gl_TexCoord[0].xy
#define S gl_TexCoord[0].z
uniform sampler2D T;

void main(){
	vec2 uv=gl_FragCoord.xy/R;
	vec3 color=texture2D(T,uv).rgb*1.2/S;
	uv-=.5;
	color += dot(uv,uv)*.5;
	color=pow(color, .45*vec3(1.2,1.1,1));
	gl_FragColor.rgb=color;
}