#include <Windows.h>
#include <gl/GL.h>
#include "glext.h"
#include "gldefs.h"
#include "frag_draw.h"
#include "frag_present.h"

#if _DEBUG
const int RENDER_TIME_MS = 3000;
const int WIDTH = 1280;
const int HEIGHT = 720;
#define FULLSCREEN 0
#else
const int RENDER_TIME_MS = 28000; // a couple of seconds leeway for decompression and stuff
const int WIDTH = 1920;
const int HEIGHT = 1080;
#define FULLSCREEN 1
#endif

#if _DEBUG
//#include <cstdio>
void __stdcall
MessageCallback(GLenum source,
	GLenum type,
	GLuint id,
	GLenum severity,
	GLsizei length,
	const GLchar* message,
	const void* userParam)
{
	/*fprintf(stderr, "GL CALLBACK: %s type = 0x%x, severity = 0x%x, message = %s\n",
		(type == GL_DEBUG_TYPE_ERROR ? "** GL ERROR **" : ""),
		type, severity, message);*/

	//__debugbreak();
	int a = 0;
}
#endif

GLuint makeFramebuffer()
{
	GLuint name, backing;
	glGenFramebuffers(1, &name);
	glBindFramebuffer(GL_FRAMEBUFFER, name);
	glGenTextures(1, &backing);
	glBindTexture(GL_TEXTURE_2D, backing);
	glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, WIDTH, HEIGHT, 0, GL_RGBA, GL_FLOAT, 0);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
	glFramebufferTexture(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, backing, 0);
	GLenum drawBuffers[] = { GL_COLOR_ATTACHMENT0 };
	glDrawBuffers(1, drawBuffers);
	return name;
}

GLuint makeShader(const char* source)
{
#if _DEBUG
	GLuint shader = glCreateShader(GL_FRAGMENT_SHADER);

	glShaderSource(shader, 1, &source, 0);
	glCompileShader(shader);

	// shader compiler errors
	GLint isCompiled = 0;
	glGetShaderiv(shader, GL_COMPILE_STATUS, &isCompiled);
	if (isCompiled == GL_FALSE)
	{
		const int maxLength = 1024;
		GLchar errorLog[maxLength];
		glGetShaderInfoLog(shader, maxLength, 0, errorLog);
		//puts(errorLog);
		glDeleteShader(shader);
		__debugbreak();
	}

	// link shader
	GLuint m_program = glCreateProgram();
	glAttachShader(m_program, shader);
	glLinkProgram(m_program);

	GLint isLinked = 0;
	glGetProgramiv(m_program, GL_LINK_STATUS, &isLinked);
	if (isLinked == GL_FALSE)
	{
		const int maxLength = 1024;
		GLchar errorLog[maxLength];
		glGetProgramInfoLog(m_program, maxLength, 0, errorLog);
		//puts(errorLog);
		glDeleteProgram(m_program);
		__debugbreak();
	}
	
	return m_program;
#else
	return glCreateShaderProgramv(GL_FRAGMENT_SHADER, 1, &source);
#endif

}

extern "C" {
	int _fltused = 1;
};

int WinMainCRTStartup()
{
	unsigned int startTime = timeGetTime();

	DEVMODE screenSettings = {
		{0}, 0, 0, sizeof(screenSettings), 0, DM_PELSWIDTH | DM_PELSHEIGHT,
		{0}, 0, 0, 0, 0, 0, {0}, 0, 0, (DWORD)WIDTH, (DWORD)HEIGHT, 0, 0,
		#if(WINVER >= 0x0400)
			0, 0, 0, 0, 0, 0,
			#if (WINVER >= 0x0500) || (_WIN32_WINNT >= 0x0400)
				0, 0
			#endif
		#endif
	};
	const PIXELFORMATDESCRIPTOR pfd = {
		sizeof(pfd), 1, PFD_DRAW_TO_WINDOW | PFD_SUPPORT_OPENGL | PFD_DOUBLEBUFFER, PFD_TYPE_RGBA,
		32, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 32, 0, 0, PFD_MAIN_PLANE, 0, 0, 0, 0
	};

#if FULLSCREEN
	ChangeDisplaySettings(&screenSettings, CDS_FULLSCREEN);
	ShowCursor(0);
	HDC hDC = GetDC(CreateWindow((LPCSTR)0xC018, 0, WS_POPUP | WS_VISIBLE | WS_MAXIMIZE, 0, 0, 0, 0, 0, 0, 0, 0));
#else
	HDC hDC = GetDC(CreateWindow((LPCSTR)0xC018, 0, WS_POPUP | WS_VISIBLE, 0, 0, WIDTH, HEIGHT, 0, 0, 0, 0));
#endif

	SetPixelFormat(hDC, ChoosePixelFormat(hDC, &pfd), &pfd);
	wglMakeCurrent(hDC, wglCreateContext(hDC));

#if _DEBUG
	glEnable(GL_DEBUG_OUTPUT);
	glDebugMessageCallback(MessageCallback, 0);
#endif

	GLuint fb = makeFramebuffer();
	GLuint shaderDraw = makeShader(draw_frag);
	GLuint shaderPresent = makeShader(present_frag);

	int sampleCount;

	glUseProgram(shaderDraw);
	glBindFramebuffer(GL_FRAMEBUFFER, fb);
	glEnable(GL_BLEND);
	glBlendFunc(GL_ONE, GL_ONE);
	for (sampleCount = 0; timeGetTime() < startTime + RENDER_TIME_MS; ++sampleCount)
	{
		PeekMessage(0, 0, 0, 0, PM_REMOVE);
		glTexCoord3f(WIDTH, HEIGHT, sampleCount/60.f);
		glRecti(-1, -1, 1, 1);
		SwapBuffers(hDC);
		if (GetAsyncKeyState(VK_ESCAPE))
			goto abort;
	}

	glUseProgram(shaderPresent);
	glBindFramebuffer(GL_FRAMEBUFFER, 0);
	glBindTexture(GL_TEXTURE_2D, fb);
	glDisable(GL_BLEND);
	while (!GetAsyncKeyState(VK_ESCAPE))
	{
		PeekMessage(0, 0, 0, 0, PM_REMOVE);
		glTexCoord3f(WIDTH, HEIGHT, sampleCount - 1.0f);
		glRecti(-1, -1, 1, 1);
		SwapBuffers(hDC);
	}

abort:
	ExitProcess(0);
}