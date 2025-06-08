package pro.beerpong.api.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import pro.beerpong.api.control.GroupController;
import pro.beerpong.api.service.AuthService;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.util.List;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private static final String GROUPS_PATTERN = "/groups/**";
    private static final String GROUP_ID_PATTERN = "/groups/{groupId}/**";
    private static final List<String> NO_VALIDATION_ENDPOINTS = List.of(
            "/groups",
            "/groups/" + GroupController.USER_GROUPS_ENDPOINT,
            "/groups/{groupId}/" + GroupController.JOIN_GROUP_ENDPOINT
    );

    private final AuthService authService;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain) throws ServletException, IOException {
        var header = req.getHeader("Authorization");

        if (!StringUtils.hasText(header) || !header.startsWith("Bearer ")) {
            res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            res.getWriter().write("Missing or invalid Authorization header!");
            return;
        }

        var token = header.substring(7);
        var user = authService.userFromAccessToken(token);

        if (user == null) {
            res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            res.getWriter().write("Invalid access token or invalid user-id!");
            return;
        }

        if (!isExcludedFromValidation(req) && !authService.hasAccessToGroup(user, extractGroupId(req))) {
            res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            res.getWriter().write("No access to this group!");
            return;
        }

        var auth = new UsernamePasswordAuthenticationToken(user, null, List.of(new SimpleGrantedAuthority("ROLE_GROUP_MEMBER")));
        SecurityContextHolder.getContext().setAuthentication(auth);

        chain.doFilter(req, res);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !pathMatcher.match(GROUPS_PATTERN, request.getRequestURI());
    }

    private boolean isExcludedFromValidation(HttpServletRequest request) {
        return NO_VALIDATION_ENDPOINTS.stream().anyMatch(s -> pathMatcher.match(s, request.getRequestURI()));
    }

    private String extractGroupId(HttpServletRequest request) {
        return (pathMatcher.match(GROUP_ID_PATTERN, request.getRequestURI()) ?
                pathMatcher.extractUriTemplateVariables(GROUP_ID_PATTERN, request.getRequestURI()).get("groupId") :
                "");
    }
}
