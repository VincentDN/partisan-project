"""Author a closed field-jacket shell, garment details and the unchanged Recon v1 skeleton."""
import bpy, bmesh, math
from mathutils import Vector


def point(x,y,z):
    return Vector((y*1.85,-x*1.85,(z+.5)*1.85))


def skeleton():
    data=bpy.data.armatures.new('ReconFoundation');arm=bpy.data.objects.new('Armature',data)
    bpy.context.collection.objects.link(arm);bpy.context.view_layer.objects.active=arm
    arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    def bone(name,a,b,parent=None):
        joint=data.edit_bones.new(name);joint.head=point(*a);joint.tail=point(*b)
        if parent:joint.parent=data.edit_bones[parent]
        return joint
    bone('root',(0,0,-.5),(0,0,-.44));bone('pelvis',(0,0,-.025),(0,0,.045),'root')
    for i,(a,b) in enumerate([(.045,.115),(.115,.185),(.185,.255),(.255,.315)],1):
        bone('spine_0'+str(i),(0,0,a),(0,0,b),'pelvis' if i==1 else 'spine_0'+str(i-1))
    bone('neck_01',(0,0,.315),(0,0,.34),'spine_04')
    bone('neck_02',(0,0,.34),(0,0,.355),'neck_01')
    bone('neck_03',(0,0,.355),(0,0,.37),'neck_02');bone('head',(0,0,.37),(0,0,.49),'neck_03')
    for side,s in [('r',-1),('l',1)]:
        wrist=.075 if side=='r' else .03
        bone('clavicle_'+side,(0,0,.285),(0,.12*s,.285),'spine_04')
        bone('upperarm_'+side,(0,.12*s,.285),(-.013,.16*s,.16),'clavicle_'+side)
        bone('lowerarm_'+side,(-.013,.16*s,.16),(.012,.185*s,wrist),'upperarm_'+side)
        hand=bone('hand_'+side,(.012,.185*s,wrist),(.035,.19*s,wrist-.055),'lowerarm_'+side)
        hand.align_roll(Vector((-s,0,0)))
        bone('thigh_'+side,(0,.073*s,-.02),(0,.095*s,-.235),'pelvis')
        bone('calf_'+side,(0,.095*s,-.235),(-.005,.125*s,-.445),'thigh_'+side)
        bone('foot_'+side,(-.005,.125*s,-.445),(.065,.125*s,-.48),'calf_'+side)
        bone('ball_'+side,(.065,.125*s,-.48),(.081,.125*s,-.48),'foot_'+side)
    bpy.ops.object.mode_set(mode='OBJECT');return arm


def mesh(name,verts,faces,material):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(data);bm.free();data.materials.append(material)
    return obj


PROFILE=[(.909,.183,.126),(.935,.190,.132),(.974,.186,.130),(1.045,.171,.118),
         (1.115,.175,.123),(1.205,.187,.139),(1.315,.210,.155),(1.415,.237,.146),
         (1.475,.218,.119),(1.515,.108,.088),(1.555,.094,.078),(1.576,.094,.078)]


def jacket(material):
    """Closed radial shell: finished back, hem, shoulders and collar; no source vest surfaces."""
    verts=[];count=20
    for k,(z,rx,depth) in enumerate(PROFILE):
        for i in range(count):
            a=i*math.tau/count
            # Gentle folds break the cylindrical silhouette, with an intentionally quiet chest.
            fold=(.0025*math.sin(3*a+k*1.9)+.0015*math.cos(5*a-k)) if 1<k<8 else 0
            verts.append(((rx+fold)*math.sin(a),-(depth+fold)*math.cos(a),z))
    faces=[]
    for k in range(len(PROFILE)-1):
        for i in range(count):
            a=k*count+i;b=k*count+(i+1)%count
            faces.append((a,b,b+count,a+count))
    faces.extend([tuple(reversed(range(count))),tuple(range((len(PROFILE)-1)*count,len(PROFILE)*count))])
    return mesh('SK_CM_Jacket',verts,faces,material)


def front_depth(z):
    for (a,_,d),(b,_,e) in zip(PROFILE,PROFILE[1:]):
        if z<=b:return d+(e-d)*max(0,(z-a)/(b-a))
    return PROFILE[-1][2]


def details(material,stitch):
    """Thin sewn zipper placket and slanted welt pockets, never armour or removable equipment."""
    verts=[];faces=[]
    for z,_,_ in PROFILE[1:]:
        y=-front_depth(z)-.0015
        verts.extend([(-.010,y,z),(.010,y,z)])
    for i in range(len(PROFILE)-2):faces.append((2*i,2*i+1,2*i+3,2*i+2))
    placket=mesh('SK_CM_Placket',verts,faces,material)
    # Narrow pocket mouths lie on the shell and deform with its spine weights.
    pockets=[]
    for side in [-1,1]:
        verts=[]
        for x,z in [(.091,1.13),(.145,1.06)]:
            rx=next(rx for h,rx,d in PROFILE if h>=z)
            y=-front_depth(z)*math.sqrt(1-(x/rx)**2)-.004
            verts.extend([(side*(x-.003),y,z-.002),(side*(x+.003),y,z+.002)])
        pockets.append(mesh('SK_CM_Welt_'+('L' if side>0 else 'R'),verts,[(0,1,3,2)],stitch))
    return [placket,*pockets]


def neck(material):
    verts=[];faces=[];n=12
    for z,rx,ry in [(1.50,.088,.075),(1.565,.090,.075),(1.615,.082,.068)]:
        for i in range(n):
            a=i*math.tau/n;verts.append((rx*math.sin(a),-ry*math.cos(a),z))
    for k in range(2):
        for i in range(n):
            a=k*n+i;b=k*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    faces.extend([tuple(reversed(range(n))),tuple(range(2*n,3*n))])
    return mesh('SK_CM_Neck',verts,faces,material)


def waist(material):
    verts=[];faces=[];n=16
    for z,rx,ry in [(.855,.158,.114),(.915,.179,.126),(.974,.172,.119)]:
        for i in range(n):
            a=i*math.tau/n;verts.append((rx*math.sin(a),-ry*math.cos(a),z))
    for k in range(2):
        for i in range(n):
            a=k*n+i;b=k*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    faces.extend([tuple(reversed(range(n))),tuple(range(2*n,3*n))])
    return mesh('SK_CM_Waist',verts,faces,material)


def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)


def pair(a,b,t):
    return {a:1-t,b:t}


def weights(name,p):
    side='r' if name.endswith('_R') else 'l';z=p.z/1.85-.5
    if any(part in name for part in ['Head','Face','Mask','Nose','Ear','Lips','Eye']):return {'head':1}
    if 'Glove' in name or 'Cuff' in name:return {'hand_'+side:1}
    if 'Boot' in name:return {'foot_'+side:1}
    if 'Waist' in name:return {'pelvis':1}
    if 'Trousers' in name:
        if z>-.08:return pair('thigh_'+side,'pelvis',smooth(-.08,.025,z))
        if z<-.40:return pair('calf_'+side,'foot_'+side,1-smooth(-.455,-.40,z))
        return pair('calf_'+side,'thigh_'+side,smooth(-.275,-.195,z))
    if 'Sleeve' in name:
        return pair('lowerarm_'+side,'upperarm_'+side,smooth(.115,.20,z))
    if 'Neck' in name:return pair('spine_04','head',smooth(.29,.375,z))
    centers=[(-.02,'pelvis'),(.07,'spine_01'),(.145,'spine_02'),(.22,'spine_03'),(.295,'spine_04')]
    torso={'spine_04':1}
    for (lo,a),(hi,b) in zip(centers,centers[1:]):
        if z<=hi:torso=pair(a,b,smooth(lo,hi,z));break
    # The continuous jacket receives heat weights in the builder; torso weights also fit sewn details.
    return torso
