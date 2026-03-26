import os
from jinja2 import Template
from typing import Any, Dict

def render_prompt(template_name: str, data: Dict[str, Any]) -> str:
    """
    Renders a Jinja2 template from the prompts/ directory.
    """
    # Assuming this file is at apps/ai-service/core/prompts.py
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    template_path = os.path.join(base_dir, "prompts", template_name)
    
    if not os.path.exists(template_path):
        # Try adding .j2 extension if it's missing
        if not template_name.endswith(".j2"):
            alt_path = template_path + ".j2"
            if os.path.exists(alt_path):
                template_path = alt_path
            
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Template {template_name} not found at {template_path}")
        
    with open(template_path, "r") as f:
        template = Template(f.read())
        
    return template.render(**data)
