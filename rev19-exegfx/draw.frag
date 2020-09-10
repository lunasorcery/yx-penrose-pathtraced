#version 120
#define iResolution gl_TexCoord[0]
#define iTime gl_TexCoord[0].z

#define pi (acos(-1.))

float hash(vec3 p3){
    p3 = fract(p3*.1031);
	p3 += dot(p3,p3.yzx+19.19);
    return fract((p3.x+p3.y)*p3.z);
}

vec2 rotate(vec2 a, float b)
{
    float c = cos(b);
    float s = sin(b);
    return vec2(
        a.x * c - a.y * s,
        a.x * s + a.y * c
    );
}

float sdBox( vec3 p, vec3 b )
{
    p=abs(p)-b;
    return max(max(p.x,p.y),p.z);
}

vec2 hash2( const float n ) {
	return fract(sin(vec2(n,n+1.))*vec2(43758.5453123));
}
/*vec2 hash2( const vec2 n ) {
	return fract(sin(vec2( n.x*n.y, n.x+n.y))*vec2(25.1459123,312.3490423));
}*/

// controls the size, go with 4 or 5
float T=4.;

float scene(vec3 p)
{
    float d = 1e9;
    
    float fl=p.y+T+1.;
    
    // left beam
    d=min(d,sdBox(p+vec3(0,T,0),vec3(T,0,0)+1.));
    
    // vertical beam
	d=min(d,sdBox(p-vec3(T,0,0),vec3(0,T-2.,0)+1.));
    
    // slicing hack
    float plane = p.x+p.z-(T-2.)+fract(iTime)*(T*2.-6.);
    
    // back beam
    d=min(d, max(plane-1., sdBox(p+vec3(T,T,-T+1.),vec3(1.,1.,T))));
    
    // top beam
    d=min(d, max(-plane, sdBox(p-vec3(T,T,1.-T),vec3(1.,1.,T))));
    
    // experimental things to make the shape interesting - more exploration needed
    //p=fract(p-.5)-.5;
    //d = max(d,sdBox(p,vec3(.4)));
   	p=mod(p+vec3(1,1,1),2.)-1.;
    d = max(d,sdBox(p,vec3(.8)));
    
    vec2 a=vec2(1,.2);
    //d=max(d,-sdBox(p,a.xyy));
    //d=max(d,-sdBox(p,a.yxy));
    //d=max(d,-sdBox(p,a.yyx));
    
    /*p=fract(p)-.5;
    d = max(d,sdBox(p,vec3(.45)));
    p=mod(p,.5)-.25;
    d = max(d,sdBox(p,vec3(.225)));
    p=mod(p,.25)-.125;
    d = max(d,sdBox(p,vec3(.1125)));*/
    
    // spheroid constructions
    //float pw=length(fract(p)-.5);
    //float pw=p.y;
    //float pw=length(fract(p*.5+vec3(0,0,0))-.5);
    //d=max(d,abs(mod(pw,.2)-.1)-.01);
    //d=max(d,abs(mod(pw,.1)-.05)-.025);
    
    d=min(d,fl);
    
    return d;
}

/*vec3 B(vec3 i, vec3 n)
{
    float time=mod(iTime,30.);
	vec3 r = texture(iChannel0,i.xy*137.311+vec2(time*7.311,time*17.311)).xyz-.5;
    r=normalize(r);
    if(any(isnan(r)))
        r=vec3(0,1,0);
    if(dot(r,n)<0.)
        return -r;
    return r;
}*/

vec2 rv2;
vec3 B( vec3 i, vec3 n ) {
	vec3  uu = normalize( cross( n, vec3(0.0,1.0,1.0) ) );
	vec3  vv = cross( uu, n );
	
	float ra = sqrt(rv2.y);
	float rx = ra*cos(6.2831*rv2.x); 
	float ry = ra*sin(6.2831*rv2.x);
	float rz = sqrt( 1.0-rv2.y );
	vec3  rr = vec3( rx*uu + ry*vv + rz*n );

    return normalize( rr );
}

vec3 trace(vec3 cam, vec3 dir)
{
    vec3 accum = vec3(1);
    vec3 lastNormal;
    for(int bounce=0;bounce<4;++bounce)
    {
        float t=(bounce==0)?5.:0.;
        float k;
        for(int i=0;i<100;++i)
        {
            k = scene(cam+dir*t);
            t += k;
            if (abs(k) < .001)
                break;
        }

        if(abs(k)<.001)
        {
			vec3 h = cam+dir*t;
			vec2 o = vec2(.001, 0);
			vec3 n = normalize(vec3(
				scene(h+o.xyy)-scene(h-o.xyy),
				scene(h+o.yxy)-scene(h-o.yxy),
				scene(h+o.yyx)-scene(h-o.yyx)
			));

            /*float roughness = 1.;
            cam = h+n*.02;
            dir = mix(reflect(dir,n), B(gl_FragCoord.xyz/iResolution.xyz,n), roughness);*/

			cam = h+n*.02;
            dir = B(gl_FragCoord.xyz/iResolution.xyz,n);


            //accum *= dot(dir,n);// * fract(h);
            accum /= acos(-1.);
            //accum *= texture(iChannel2,h*.0625+.5/iChannelResolution[2].xyz).rgb;
            
            //accum *= texture(iChannel0, (h.xz+1.5)/iChannelResolution[0].xy).rgb;
            
            //h.z +=4.;
            //h.x--;
            h.xz+=vec2(-1,1);
            
            // cheap dof hack
            h.xz+= (rv2-.5) * max(0.,abs(h.x-h.z)-5.) * .01;

            // grid
            float gridscale=2.;
            vec3 a = 1.-step(.49,abs(fract(h*gridscale)-.5));
            float f=min(a.z,a.x);
            
            // checkerboard
            gridscale=.125;
            gridscale=.25;
			h.xz++;
            f*=.8-step(.0,(fract(h.x*gridscale)-.5)*(fract(h.z*gridscale)-.5))*.3;
            
            //f=.8;
            
            if(h.y<-T-.99)
            	accum *= f;
        }
    }
    
    vec3 lightdir = normalize(vec3(4,1,-4));
    lightdir=vec3(0,1,0);
    //lightdir=normalize(vec3(1,1,-1));
    //lightdir=normalize(vec3(4,1,0));
    return accum * max(0.,dot(dir,lightdir)) * 3.;
}

void main()
{
    vec2 uv = gl_FragCoord.xy/iResolution.xy-.5;

    float seed = iTime+(uv.x+iResolution.x*uv.y)*1.51269341231;
	rv2 = hash2( 24.4316544311+iTime+seed );
    uv += (rv2-.5)/iResolution.xy;
    
    uv.x*=iResolution.x/iResolution.y;

	vec3 cam = vec3(uv*15.,-20.);
    cam.y-=5./3.;
    //cam.x++;
    cam.x+=.75;
    vec3 dir = vec3(0,0,1);

    cam.yz = rotate(cam.yz, atan(1.,sqrt(2.)));
    dir.yz = rotate(dir.yz, atan(1.,sqrt(2.)));

    cam.xz = rotate(cam.xz, pi/4.);
    dir.xz = rotate(dir.xz, pi/4.);

   // vec4 prev = texture(iChannel1,fragCoord/iResolution.xy);
	vec4 pixel = vec4(trace(cam,dir)*(1.-dot(uv,uv)*.5),1);
    
    // reset buffer if we're clicking
    //if (iMouse.z > 0.) prev *= 0.;
    //if(any(isnan(pixel))) pixel=vec4(0.);

    // accumulate the pixel
    gl_FragColor = pixel;// + prev;
}