## Supported Versions                                                                                                                             
                                                                                                                                                  
Use this section to tell people about which versions of your project are                                                                          
currently being supported with security updates.                                                                                                  
                                                                                                                                                  
| Version | Supported          |                                                                                                                  
| ------- | ------------------ |                                                                                                                  
| 5.1.x   | :white_check_mark: |                                                                                                                  
| 5.0.x   | :x:                |                                                                                                                  
| 4.0.x   | :white_check_mark: |                                                                                                                  
| < 4.0   | :x:                |                                                                                                                  
                                                                                                                                                  
## Reporting a Vulnerability                                                                                                                      
                                                                                                                                                  
Use this section to tell people how to report a vulnerability.                                                                                    
                                                                                                                                                  
Tell them where to go, how often they can expect to get an update on a                                                                            
reported vulnerability, what to expect if the vulnerability is accepted or                                                                        
declined, etc.                                                                                                                                    
                                                                                                                                                  

⏺ Security Policy

  Supported Versions                                                                                                                              
   
  twohrs is a continuously deployed web application. Only the latest production deployment is supported with security updates.                    
                                                                                                                                                
  ┌──────────────────────┬────────────────────┐                                                                                                   
  │       Version        │     Supported      │                                                                                                 
  ├──────────────────────┼────────────────────┤         
  │ Latest (main branch) │ :white_check_mark: │
  ├──────────────────────┼────────────────────┤
  │ Older deployments    │ :x:                │                                                                                                   
  └──────────────────────┴────────────────────┘
                                                                                                                                                  
  Reporting a Vulnerability                                                                                                                     
                                                        
  Please do not report security vulnerabilities through public GitHub issues.                                                                     
   
  Instead, please report them via GitHub Private Vulnerability Reporting:                                                                         
                                                                                                                                                
  1. Go to the Security tab of this repository                                                                                                    
  2. Click "Report a vulnerability"                                                                                                             
  3. Fill out the form with as much detail as possible                                                                                            
                                                                                                                                                  
  What to include                                       
                                                                                                                                                  
  - Description of the vulnerability                                                                                                            
  - Steps to reproduce                                  
  - Potential impact
  - Suggested fix (if any)                                                                                                                        
   
  What to expect                                                                                                                                  
                                                                                                                                                
  - Acknowledgment within 48 hours of your report                                                                                                 
  - Status update within 7 days with an assessment and expected timeline
  - We will work with you to understand and resolve the issue before any public disclosure                                                        
  - Once fixed, we will credit you in the fix (unless you prefer to remain anonymous)                                                             
                                                                                                                                                  
  Scope                                                                                                                                           
                                                                                                                                                  
  The following are in scope:                                                                                                                     
                                                        
  - Production application at twohrs.com                                                                                                          
  - Authentication and authorization flaws                                                                                                      
  - Data exposure or leakage                                                                                                                      
  - Injection vulnerabilities (SQL, XSS, etc.)
  - Server-side request forgery (SSRF)                                                                                                            
  - Broken access control                                                                                                                       
                                                                                                                                                  
  The following are out of scope:                                                                                                               
                                                        
  - Denial of service (DoS) attacks                                                                                                               
  - Social engineering
  - Issues in third-party dependencies with no demonstrated exploit                                                                               
  - The application being unavailable outside its operating window (this is by design)                                                            
                                                                                                                                                  
  Security Practices                                                                                                                              
                                                                                                                                                  
  This project follows security best practices including server-side input validation, database-level row-level security (RLS), rate limiting,    
  NSFW content detection, and magic-byte file validation for uploads.
