"""Build cuffed gloves with thirty articulated finger joints beneath the unchanged Recon hand frames."""
import bpy, math
from mathutils import Vector
import recon_foundation_geometry as geo


def build(arm, material):
    bpy.ops.object.select_all(action='DESELECT');arm.select_set(True)
    bpy.context.view_layer.objects.active=arm
    bpy.ops.object.mode_set(mode='EDIT')
    frames={side:arm.data.edit_bones['hand_'+side].matrix.copy() for side in ['r','l']}
    fingers={}
    for side in ['r','l']:
        sign=1 if side=='r' else -1
        for name,x,y,lengths in [('index',.028,.090,[.035,.024,.020]),('middle',.009,.097,[.041,.026,.022]),
                                 ('ring',-.012,.094,[.037,.024,.020]),('pinky',-.032,.083,[.027,.019,.018]),
                                 ('thumb',.041,.032,[.028,.024,.021])]:
            direction=Vector((sign*.70,.69,.18)).normalized() if name=='thumb' else Vector((0,1,0))
            points=[Vector((sign*x,y,0))]
            for length in lengths:points.append(points[-1]+direction*length)
            names=[]
            for i in range(3):
                key=f'{name}_{i+1:02}_{side}';bone=arm.data.edit_bones.new(key)
                bone.head=frames[side]@points[i];bone.tail=frames[side]@points[i+1]
                bone.align_roll(frames[side].to_3x3()@Vector((0,0,1)))
                bone.parent=arm.data.edit_bones[names[-1] if names else 'hand_'+side]
                names.append(key)
            fingers[(side,name)]=(points,names,direction)
    bpy.ops.object.mode_set(mode='OBJECT')
    result=[]
    for side in ['r','l']:
        verts=[];faces=[];weights=[];frame=frames[side];hand='hand_'+side
        def tube(centers,radii,axis,bindings,segments=8):
            start=len(verts);axis=axis.normalized();u=Vector((1,0,0))
            if abs(axis.dot(u))>.9:u=Vector((0,0,1))
            u=(u-axis*u.dot(axis)).normalized();v=u.cross(axis).normalized()
            for center,(wide,deep),binding in zip(centers,radii,bindings):
                for i in range(segments):
                    a=i*math.tau/segments
                    verts.append(frame@(center+u*math.cos(a)*wide+v*math.sin(a)*deep));weights.append(binding)
            for k in range(len(centers)-1):
                for i in range(segments):
                    a=start+k*segments+i;b=start+k*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
            faces.extend([tuple(reversed(range(start,start+segments))),tuple(range(len(verts)-segments,len(verts)))])
        tube([Vector((0,y,0)) for y in [-.035,.015,.046,.088]],
             [(.049,.039),(.040,.026),(.043,.021),(.039,.019)],Vector((0,1,0)),[{hand:1}]*4)
        # Round the knuckle ridge up to the middle finger so every finger root overlaps the palm.
        inverse=frame.inverted()
        for index in range(24,32):
            local=inverse@verts[index];local.y=.087+.015*(1-(local.x/.043)**2);verts[index]=frame@local
        for name in ['index','middle','ring','pinky','thumb']:
            points,names,axis=fingers[(side,name)];centers=[];radii=[];bindings=[]
            radius=.009 if name=='pinky' else .011
            for i in range(3):
                centers.extend([points[i],points[i].lerp(points[i+1],.5)])
                radii.extend([(radius*(1-i*.10),radius*(1-i*.10))]*2)
                bindings.extend([{names[i]:1} if i==0 else {names[i-1]:.5,names[i]:.5},{names[i]:1}])
            centers.append(points[-1]);radii.append((radius*.60,radius*.60));bindings.append({names[-1]:1})
            tube(centers,radii,axis,bindings)
        obj=geo.mesh('SK_CM_Glove_'+side.upper(),verts,faces,material)
        for bone in arm.data.bones:obj.vertex_groups.new(name=bone.name)
        for i,binding in enumerate(weights):
            for bone,weight in binding.items():obj.vertex_groups[bone].add([i],weight,'REPLACE')
        for polygon in obj.data.polygons:polygon.use_smooth=True
        mod=obj.modifiers.new('Recon v2 articulated glove','ARMATURE');mod.object=arm;obj.parent=arm
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.01)
        bpy.ops.object.mode_set(mode='OBJECT');result.append(obj)
    return result
